const {
  idp,
  resolveTarget,
  resolveTargetByAcsUrl,
  parseAuthnRequest,
  createTemplateCallback,
  debugDeliver,
} = require('../lib/saml');
const { escapeHtml } = require('../lib/html-escape');
const { isValidRelayState, MAX_RELAY_STATE_LENGTH } = require('../lib/saml-input');
const { respondError } = require('./_shared/respond-error');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { email, name, SAMLRequest, RelayState, target } = req.body || {};

  // RelayState는 자동 제출 폼에 그대로 반영되므로 형식·길이 검증 (반영 시 이스케이프)
  if (!isValidRelayState(RelayState)) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: 'RelayState 값이 올바르지 않습니다.',
      reason: `RelayState는 ${MAX_RELAY_STATE_LENGTH}자 이하의 단일 문자열이어야 합니다.`,
      action: 'SP(eformsign)에서 SSO 로그인을 다시 시작하세요.',
      logMessage: 'auth: invalid RelayState',
    });
  }

  const user = {
    email: email,
    name: name
  };

  // 대상 서버 결정 우선순위: ① 명시적 target(test/dev) → ② 요청의 AssertionConsumerServiceURL → ③ test 폴백.
  // 요청 ACS는 화이트리스트(ACS_URLS)에 일치하는 값만 허용(서명된 Assertion 유출 방지).
  // SP 개시 흐름: AuthnRequest에서 ACS URL과 요청 ID를 함께 파싱한다(P0b-11).
  // 요청 ID는 InResponseTo로 들어가 SP가 요청-응답을 묶고 재전송을 막는 데 쓴다. 없으면 InResponseTo 생략.
  const { acsUrl: requestedAcs, requestId } = parseAuthnRequest(SAMLRequest);
  const explicit = (target === 'test' || target === 'test2' || target === 'testjp' || target === 'dev' || target === 'prod') ? target : null;
  const { key, acsUrl, sp } = explicit
    ? resolveTarget(explicit)
    : resolveTargetByAcsUrl(requestedAcs);

  try {
    const { context } = await idp.createLoginResponse(
      sp,
      requestId ? { extract: { request: { id: requestId } } } : {},
      'post',
      user,
      createTemplateCallback(acsUrl, user, requestId)
    );

    const decodedXml = Buffer.from(context, 'base64').toString('utf-8');
    const hasAttributes = decodedXml.includes('AttributeStatement');
    console.log(`🚀 SAML Response Generated → ${key} 서버 (${acsUrl}) | 결정: ${explicit ? 'target=' + explicit : '요청ACS'} | 요청 ACS: ${requestedAcs || '없음'} | InResponseTo: ${requestId || '(생략)'} | Has Attributes? ${hasAttributes}`);

    const debugOn = process.env.SAML_DEBUG === '1'
      && (req.query?.debug === '1' || req.body?.debug === '1');
    await debugDeliver({
      enabled: debugOn,
      key,
      acsUrl,
      decision: explicit ? ('target=' + explicit) : '요청ACS',
      requestedAcs,
      context,
      relayState: RelayState,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="${escapeHtml(acsUrl)}">
          <input type="hidden" name="SAMLResponse" value="${escapeHtml(context)}">
          <input type="hidden" name="RelayState" value="${escapeHtml(RelayState || '')}">
        </form>
        <p>eformsign으로 이동 중입니다...</p>
      </body>
      </html>
    `);

  } catch (e) {
    console.error("❌ SAML Error:", e);
    // 예외 메시지·스택은 서버 로그에만 남기고 응답에는 일반 문구만 반환
    return respondError(req, res, 500, {
      code: 'INTERNAL_ERROR',
      message: 'SAML 응답을 생성하지 못했습니다.',
      reason: '요청 처리 중 서버 내부 오류가 발생했습니다.',
      action: 'SP(eformsign)에서 SSO 로그인을 다시 시작하세요. 문제가 계속되면 관리자에게 문의하세요.',
      logMessage: 'auth: SAML login response generation failed',
    });
  }
};
