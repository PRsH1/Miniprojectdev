// lib/saml.js
const samlify = require('samlify');

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

const idpOptions = {
  entityID: `${baseUrl}/api/metadata`,
  
  // [수정] 복잡한 XML 문자열(context) 대신 attributes 매핑 사용
  loginResponseTemplate: {
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
  dev:  'https://dev-service.eformsign.com/v1.0/saml_redirect',
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

const sps = {
  test: buildSp(ACS_URLS.test),
  dev:  buildSp(ACS_URLS.dev),
};

// target 문자열 → { key, acsUrl, sp }. 미지정/미지원 값은 test로 폴백.
function resolveTarget(target) {
  const key = ACS_URLS[target] ? target : 'test';
  return { key, acsUrl: ACS_URLS[key], sp: sps[key] };
}

module.exports = { idp, sp: sps.test, sps, ACS_URLS, resolveTarget };
