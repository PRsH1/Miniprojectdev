const { idp, resolveTarget, resolveTargetByAcsUrl, extractAcsUrl } = require('../lib/saml');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { email, name, SAMLRequest, RelayState, target } = req.body;

  const user = {
    email: email,
    name: name
  };

  // 대상 서버 결정 우선순위: ① 명시적 target(test/dev) → ② 요청의 AssertionConsumerServiceURL → ③ test 폴백.
  // 요청 ACS는 화이트리스트(ACS_URLS)에 일치하는 값만 허용(서명된 Assertion 유출 방지).
  const requestedAcs = extractAcsUrl(SAMLRequest);
  const explicit = (target === 'test' || target === 'dev') ? target : null;
  const { key, acsUrl, sp } = explicit
    ? resolveTarget(explicit)
    : resolveTargetByAcsUrl(requestedAcs);

  try {
    const { context } = await idp.createLoginResponse(
      sp,
      { extract: { request: { id: 'request_id' } } },
      'post',
      user
    );

    const hasAttributes = context.includes('AttributeStatement');
    console.log(`🚀 SAML Response Generated → ${key} 서버 (${acsUrl}) | 결정: ${explicit ? 'target=' + explicit : '요청ACS'} | 요청 ACS: ${requestedAcs || '없음'} | Has Attributes? ${hasAttributes}`);

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="${acsUrl}">
          <input type="hidden" name="SAMLResponse" value="${context}">
          <input type="hidden" name="RelayState" value="${RelayState || ''}">
        </form>
        <p>eformsign으로 이동 중입니다...</p>
      </body>
      </html>
    `);

  } catch (e) {
    console.error("❌ SAML Error:", e);
    res.status(500).send('SAML Error: ' + e.message);
  }
};