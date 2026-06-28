const { idp, resolveTarget, createTemplateCallback, debugDeliver } = require('../lib/saml');

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
        <form method="POST" action="${acsUrl}">
          <input type="hidden" name="SAMLResponse" value="${context}">
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
    res.status(500).send('SSO Generation Failed: ' + e.message);
  }
};
