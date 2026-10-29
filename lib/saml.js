// lib/saml.js
const samlify = require('samlify');
const zlib = require('zlib');
const { v4: uuid } = require('uuid');

const { SamlLib } = samlify;

const privateKey = process.env.SAML_PRIVATE_KEY
  ? Buffer.from(process.env.SAML_PRIVATE_KEY, 'base64').toString('utf-8')
  : '';

const publicCert = process.env.SAML_PUBLIC_CERT
  ? Buffer.from(process.env.SAML_PUBLIC_CERT, 'base64').toString('utf-8')
  : '';

function getBaseUrl() {
  const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('BASE_URL 환경변수가 설정되지 않았습니다.');
  }
  return baseUrl;
}

const baseUrl = getBaseUrl();

const RESPONSE_CONTEXT = '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}" InResponseTo="{InResponseTo}"><saml:Issuer>{Issuer}</saml:Issuer><samlp:Status><samlp:StatusCode Value="{StatusCode}"/></samlp:Status><saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{AssertionID}" Version="2.0" IssueInstant="{IssueInstant}"><saml:Issuer>{Issuer}</saml:Issuer><saml:Subject><saml:NameID Format="{NameIDFormat}">{NameID}</saml:NameID><saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData NotOnOrAfter="{SubjectConfirmationDataNotOnOrAfter}" Recipient="{SubjectRecipient}" InResponseTo="{InResponseTo}"/></saml:SubjectConfirmation></saml:Subject><saml:Conditions NotBefore="{ConditionsNotBefore}" NotOnOrAfter="{ConditionsNotOnOrAfter}"><saml:AudienceRestriction><saml:Audience>{Audience}</saml:Audience></saml:AudienceRestriction></saml:Conditions>{AuthnStatement}{AttributeStatement}</saml:Assertion></samlp:Response>';

const idpOptions = {
  entityID: `${baseUrl}/api/metadata`,
  
  loginResponseTemplate: {
    context: RESPONSE_CONTEXT,
    attributes: [
      {
        // eformsign(Azure AD 호환)에서 기대하는 클레임 URI
        name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        valueTag: 'email', // user.email 값을 매핑
        nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
        valueXsiType: 'xs:string'
      },
      {
        name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        valueTag: 'name', // user.name 값을 매핑
        nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
        valueXsiType: 'xs:string'
      }
    ]
  },
  
  singleSignOnService: [{
    Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
    Location: `${baseUrl}/api/sso-login`
  }],
  
  singleLogoutService: [{
    Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
    Location: `${baseUrl}/api/slo`
  }],

  signingCert: publicCert,
  privateKey: privateKey,
  nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified']
};

// eformsign SAML Redirect(ACS) 대상 서버 맵
const ACS_URLS = {
  test: 'https://test-kr-service.eformsign.com/v1.0/saml_redirect',
  test2 : 'https://test-service.eformsign.com/v1.0/saml_redirect',
  testjp: 'https://test-jp-service.eformsign.com/v1.0/saml_redirect',
  dev:  'https://dev-service.eformsign.com/v1.0/saml_redirect',
  prod: 'https://service.eformsign.com/v1.0/saml_redirect'
};

// SP(eformsign)의 ACS Location은 SAML Response의 Destination/Recipient로 삽입되므로,
// 대상 서버마다 SP 인스턴스를 분리 생성해야 한다. (단순히 폼 action만 바꾸면 Destination 불일치로 거부될 수 있음)
function buildSp(location) {
  return samlify.ServiceProvider({
    entityID: 'urn:eformsign:service',
    assertionConsumerService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Location: location,
    }],
  });
}

const idp = samlify.IdentityProvider(idpOptions);

// ACS_URLS의 모든 키에 대해 SP 인스턴스를 자동 생성한다.
// (ACS_URLS에 대상 서버를 추가하면 별도 수정 없이 자동 반영)
const sps = Object.fromEntries(
  Object.entries(ACS_URLS).map(([key, url]) => [key, buildSp(url)])
);

// target 문자열 → { key, acsUrl, sp }. 미지정/미지원 값은 test로 폴백.
function resolveTarget(target) {
  const key = ACS_URLS[target] ? target : 'test';
  return { key, acsUrl: ACS_URLS[key], sp: sps[key] };
}

// ACS URL(요청에 담긴 AssertionConsumerServiceURL) → { key, acsUrl, sp }.
// 화이트리스트(ACS_URLS)에 일치하는 값만 허용하고, 없으면 test로 폴백.
// (서명된 Assertion이 임의 URL로 유출되지 않도록 반드시 화이트리스트 검증)
function resolveTargetByAcsUrl(acsUrl) {
  const entry = Object.entries(ACS_URLS).find(([, url]) => url === acsUrl);
  return resolveTarget(entry ? entry[0] : 'test');
}

// SAMLRequest → AuthnRequest XML 문자열. 실패 시 null.
// HTTP-Redirect 바인딩은 deflate+base64, HTTP-POST 바인딩은 deflate 없는 base64이므로 둘 다 시도한다.
function decodeSamlRequest(samlRequest) {
  if (!samlRequest || typeof samlRequest !== 'string') return null;
  try {
    const buf = Buffer.from(samlRequest, 'base64');
    try { return zlib.inflateRawSync(buf).toString('utf-8'); } catch (_) { /* 다음 방식 시도 */ }
    try { return zlib.inflateSync(buf).toString('utf-8'); } catch (_) { /* 다음 방식 시도 */ }
    const plain = buf.toString('utf-8');
    return plain.trimStart().startsWith('<') ? plain : null;
  } catch (_) {
    return null;
  }
}

// AuthnRequest ID는 xs:ID(NCName) 형식이어야 한다. 그 외 값은 InResponseTo에 넣지 않는다.
const REQUEST_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]{0,255}$/;

// AuthnRequest 루트 요소의 ID 속성만 추출 (Issuer 등 하위 요소 속성과 혼동하지 않도록 루트 태그 안에서만 찾는다)
function extractRequestIdFromXml(xml) {
  if (!xml) return null;
  const root = xml.match(/<(?:[A-Za-z_][\w.-]*:)?AuthnRequest\b([^>]*)>/);
  if (!root) return null;
  const m = root[1].match(/(?:^|\s)ID\s*=\s*"([^"]*)"/) || root[1].match(/(?:^|\s)ID\s*=\s*'([^']*)'/);
  if (!m) return null;
  return REQUEST_ID_PATTERN.test(m[1]) ? m[1] : null;
}

// SAMLRequest → { acsUrl, requestId }. 각 값은 찾지 못하면 null.
function parseAuthnRequest(samlRequest) {
  const xml = decodeSamlRequest(samlRequest);
  if (!xml) return { acsUrl: null, requestId: null };
  const acs = xml.match(/AssertionConsumerServiceURL="([^"]+)"/);
  return {
    acsUrl: acs ? acs[1] : null,
    requestId: extractRequestIdFromXml(xml),
  };
}

// SAMLRequest → AssertionConsumerServiceURL 추출. 디코딩/파싱 실패 시 null 반환.
function extractAcsUrl(samlRequest) {
  return parseAuthnRequest(samlRequest).acsUrl;
}

// SAMLRequest → AuthnRequest ID 추출 (P0b-11). 없거나 형식이 맞지 않으면 null.
function extractRequestId(samlRequest) {
  return parseAuthnRequest(samlRequest).requestId;
}

/**
 * Response 템플릿 콜백
 * requestId: SP 개시 흐름에서 파싱한 실제 AuthnRequest ID → Response·SubjectConfirmationData의 InResponseTo.
 *   null/undefined/빈 값이면 InResponseTo 속성을 아예 생략한다(요청 없는 응답, saml-core §3.2.2).
 *   samlify replaceTagsByValue는 속성 위치의 값이 undefined면 해당 속성을 제거한다.
 */
function createTemplateCallback(acsUrl, user, requestId) {
  return (template) => {
    const id = '_' + uuid();
    const assertionId = '_' + uuid();
    const now = new Date();
    const later = new Date(now.getTime() + 5 * 60 * 1000);
    const tvalue = {
      ID: id,
      AssertionID: assertionId,
      Destination: acsUrl,
      SubjectRecipient: acsUrl,
      Audience: 'urn:eformsign:service',
      Issuer: `${baseUrl}/api/metadata`,
      IssueInstant: now.toISOString(),
      ConditionsNotBefore: now.toISOString(),
      ConditionsNotOnOrAfter: later.toISOString(),
      SubjectConfirmationDataNotOnOrAfter: later.toISOString(),
      NameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
      NameID: user.email,
      InResponseTo: requestId || undefined,
      StatusCode: 'urn:oasis:names:tc:SAML:2.0:status:Success',
      AuthnStatement: '',
      attrEmail: user.email,
      attrName: user.name,
    };
    return { id, context: SamlLib.replaceTagsByValue(template, tvalue) };
  };
}

async function debugDeliver({ enabled, key, acsUrl, decision, requestedAcs, context, relayState }) {
  if (!enabled) return;

  try {
    const xml = Buffer.from(context, 'base64').toString('utf-8');
    const hasAttr = xml.includes('AttributeStatement');
    console.log('[SAML-DEBUG] -- 송신 SAMLResponse --');
    console.log(`[SAML-DEBUG] target=${key} acs=${acsUrl} 결정=${decision} 요청ACS=${requestedAcs || '없음'} hasAttributes=${hasAttr}`);
    console.log('[SAML-DEBUG] decoded XML ↓\n' + xml);
  } catch (e) {
    console.error('[SAML-DEBUG] XML 디코딩 실패:', e);
  }

  try {
    const form = new URLSearchParams();
    form.set('SAMLResponse', context);
    form.set('RelayState', relayState || '');
    const probeRes = await fetch(acsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      redirect: 'manual',
    });
    const headers = {};
    probeRes.headers.forEach((v, k) => { headers[k] = v; });
    const body = await probeRes.text();
    console.log('[SAML-DEBUG] -- eformsign ACS 응답 --');
    console.log(`[SAML-DEBUG] status=${probeRes.status} ${probeRes.statusText}`);
    console.log(`[SAML-DEBUG] location=${probeRes.headers.get('location') || '(없음)'}`);
    console.log(`[SAML-DEBUG] headers=${JSON.stringify(headers)}`);
    console.log(`[SAML-DEBUG] body(앞 2KB)=${body.slice(0, 2048)}`);
  } catch (e) {
    console.error('[SAML-DEBUG] ACS probe 실패(서버 다운 시 정상):', e.message);
  }
}

module.exports = {
  idp,
  sp: sps.test,
  sps,
  ACS_URLS,
  resolveTarget,
  resolveTargetByAcsUrl,
  extractAcsUrl,
  extractRequestId,
  parseAuthnRequest,
  createTemplateCallback,
  debugDeliver,
};
