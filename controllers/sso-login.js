module.exports = (req, res) => {
  const { SAMLRequest, RelayState } = req.query;
  // 명시적 대상 서버 오버라이드 (test/dev만 허용 — 그 외 값은 무시하여 XSS/오용 방지).
  // CouchDB login_url을 `.../api/sso-login?target=dev` 로 설정하면 dev로 강제 라우팅됨.
  const target = (req.query.target === 'dev' || req.query.target === 'test' || req.query.target === 'test2') ? req.query.target : '';
  const debug = req.query.debug === '1' ? '1' : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>SAML SSO Login</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; }
          .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 300px; }
          input { width: 100%; padding: 10px; margin: 5px 0 15px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
          button { width: 100%; padding: 10px; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
          button:hover { background: #0051a2; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="text-align:center;">SAML 테스트 로그인</h2>
          <form action="/api/auth" method="POST">
            <label>이메일</label>
            <input type="email" name="email" placeholder="test@example.com" required>
            
            <label>이름</label>
            <input type="text" name="name" placeholder="테스트유저" required>

            <input type="hidden" name="SAMLRequest" value="${SAMLRequest || ''}">
            <input type="hidden" name="RelayState" value="${RelayState || ''}">
            <input type="hidden" name="target" value="${target}">
            <input type="hidden" name="debug" value="${debug}">
            
            <button type="submit">로그인 및 eformsign 이동</button>
          </form>
        </div>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
