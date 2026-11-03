const { idp, resolveTarget, createTemplateCallback, debugDeliver } = require('../lib/saml');
const { escapeHtml } = require('../lib/html-escape');
const { respondError } = require('./_shared/respond-error');

// 필수 입력 누락 안내 페이지 (F-1). 폼이 새 탭으로 제출되므로 평문 대신 "이 탭 닫고 돌아가기" 버튼이 있는 HTML을 준다
// (D-22 — 예전 [돌아가기] 링크는 새 탭에 테스트 페이지를 하나 더 열었다).
// SAML 정책(0절)대로 인증은 요구하지 않는다. 보간하는 값은 모두 escapeHtml을 거친다.
const IDP_TEST_PAGE = '/app/idptestauth';

function sendMissingFieldsPage(res, missing) {
  const message = `${missing.join('과 ')}이 필요합니다.`;
  res.status(400);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>입력값 확인 — IdP 테스트</title>
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; background: #f5f7fb; color: #1f2937; }
    .box { max-width: 480px; margin: 12vh auto 0; padding: 28px 24px; background: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #d97706; border-radius: 10px; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 20px; line-height: 1.6; color: #4b5563; }
    button { padding: 10px 18px; border: 0; border-radius: 8px; background: #1a73e8; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
    .sub { margin: 14px 0 0; font-size: 13px; color: #6b7280; }
    .sub a { color: #1a73e8; }
  </style>
</head>
<body>
  <main class="box" role="alert">
    <h1>${escapeHtml(message)}</h1>
    <p>IdP 개시 로그인 테스트에는 이메일과 이름이 모두 필요합니다. 이 탭을 닫고 원래 테스트 페이지에서 입력한 뒤 다시 시도하세요.</p>
    <button type="button" id="closeTabBtn" onclick="if (history.length &gt; 1) { history.back(); } else { window.close(); } document.getElementById('closeHint').hidden = false;">이 탭 닫고 돌아가기</button>
    <p class="sub" id="closeHint" hidden>탭이 닫히지 않으면 브라우저에서 이 탭을 직접 닫아 주세요.</p>
    <p class="sub">원래 탭을 닫았다면 <a href="${escapeHtml(IDP_TEST_PAGE)}">테스트 페이지 새로 열기</a></p>
  </main>
</body>
</html>`);
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

module.exports = async (req, res) => {
  const { email, name, target } = req.body || {};

  const missing = [];
  if (isBlank(email)) missing.push('이메일');
  if (isBlank(name)) missing.push('이름');
  if (missing.length) {
    return sendMissingFieldsPage(res, missing);
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
