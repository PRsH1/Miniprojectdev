const { idp, resolveTarget, createTemplateCallback, debugDeliver } = require('../lib/saml');
const { escapeHtml } = require('../lib/html-escape');
const { respondError } = require('./_shared/respond-error');

module.exports = async (req, res) => {
  const { email, name, target } = req.body;

  if (!email || !name) {
    return res.status(400).send("이메일과 이름이 필요합니다.");
  }

  const user = {
    email: email,
    name: name,
    NameID: email
  };

  // 대상 서버 결정 (test 기본, dev 선택 가능). SP 인스턴스와 ACS URL을 함께 가져온다.
  const { key, acsUrl, sp } = resolveTarget(target);

  try {
    const { context } = await idp.createLoginResponse(
      sp,
      { extract: { request: { id: 'idp_initiated' } } }, // 더미 ID 제공
      'post',
      user,
      createTemplateCallback(acsUrl, user, 'idp_initiated')
    );

    console.log(`🚀 IdP Initiated Login: ${email} (${name}) → ${key} 서버 (${acsUrl})`);

    const debugOn = process.env.SAML_DEBUG === '1' && req.body?.debug === '1';
    await debugDeliver({
      enabled: debugOn,
      key,
      acsUrl,
      decision: 'idp-initiated',
      requestedAcs: null,
      context,
      relayState: '',
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting to eformsign...</title>
      </head>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="${escapeHtml(acsUrl)}">
          <input type="hidden" name="SAMLResponse" value="${escapeHtml(context)}">
          <input type="hidden" name="RelayState" value=""> 
        </form>
        <div style="text-align:center; margin-top: 20%; font-family: sans-serif;">
          <p>eformsign으로 안전하게 이동 중입니다...</p>
          <p>잠시만 기다려주세요.</p>
        </div>
      </body>
      </html>
    `);

  } catch (e) {
    console.error("❌ SSO Error:", e);
    // 예외 메시지·스택은 서버 로그에만 남기고 응답에는 일반 문구만 반환
    return respondError(req, res, 500, {
      code: 'INTERNAL_ERROR',
      message: 'SAML 응답을 생성하지 못했습니다.',
      reason: '요청 처리 중 서버 내부 오류가 발생했습니다.',
      action: '입력값을 확인한 뒤 다시 시도하세요. 문제가 계속되면 관리자에게 문의하세요.',
      logMessage: 'idp-initiated-login: SAML login response generation failed',
    });
  }
};
