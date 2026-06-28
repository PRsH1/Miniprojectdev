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

    // 진단용: ?debug=1 일 때만 서버가 직접 ACS로 POST 하여 eformsign 응답을 콘솔에 로깅한다.
    // 주의: SAML Assertion 은 보통 일회성(replay 방지)이므로, 여기서 consume 하면
    //       이어지는 브라우저 auto-submit 이 거부될 수 있다. 평상시 로그인에는 영향이 없도록 flag 로 격리.
    const debugProbe = req.query && (req.query.debug === '1' || req.query.debug === 'true');
    if (debugProbe) {
      try {
        const form = new URLSearchParams();
        form.set('SAMLResponse', context);
        form.set('RelayState', RelayState || '');

        const probeRes = await fetch(acsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          redirect: 'manual', // 302 등 리다이렉트를 따라가지 않고 그대로 확인
        });

        const probeHeaders = {};
        probeRes.headers.forEach((v, k) => { probeHeaders[k] = v; });
        const probeBody = await probeRes.text();

        console.log('📥 eformsign ACS 응답 (debug probe) ↓');
        console.log(`   → URL        : ${acsUrl}`);
        console.log(`   → Status     : ${probeRes.status} ${probeRes.statusText}`);
        console.log(`   → Location   : ${probeRes.headers.get('location') || '(없음)'}`);
        console.log(`   → Headers    : ${JSON.stringify(probeHeaders)}`);
        console.log(`   → Body(앞 2KB): ${probeBody.slice(0, 2048)}`);
      } catch (probeErr) {
        console.error('❌ eformsign ACS 응답 로깅 실패 (debug probe):', probeErr);
      }
    }

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