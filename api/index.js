// api/index.js (Lazy Loading 적용)


const controllers = {
  // --- API 엔드포인트 ---
  'auth': () => require('../controllers/auth'),
  'downloadDocument': () => require('../controllers/downloadDocument'),
  'getDocumentInfo': () => require('../controllers/getDocumentInfo'),
  'getToken': () => require('../controllers/getToken'),
  'idp-initiated-login': () => require('../controllers/idp-initiated-login'),
  'login': () => require('../controllers/login'),
  'memberPage': () => require('../controllers/memberPage'),
  'metadata': () => require('../controllers/metadata'),
  'send': () => require('../controllers/send'),
  'sso-login': () => require('../controllers/sso-login'),
  'templatecopy': () => require('../controllers/templatecopy'),
  'webhook-receiver': () => require('../controllers/webhook-receiver'),
  'idptestauth': () => require('../controllers/idptestauth'),

  // --- 페이지 엔드포인트 ---
  'ApiAutoTest': () => require('../controllers/ApiAutoTest'),
  'OpenAPIAutoTest': () => require('../controllers/OpenAPIAutoTest'),
};

module.exports = async (req, res) => {
  const { url } = req;
  const path = url.split('?')[0]; 

  let controllerKey = '';

  // 1. URL 파싱
  if (path.startsWith('/api/')) {
    controllerKey = path.replace('/api/', '').replace('/', '');
  } else if (path === '/ApiAutoTest') {
    controllerKey = 'ApiAutoTest';
  } else if (path === '/OpenAPIAutoTest') {
    controllerKey = 'OpenAPIAutoTest';
  } else if (path === '/templatecopy') {
    controllerKey = 'templatecopy';
  } else if (path === '/idptestauth') {
    controllerKey = 'idptestauth';
  }

  // 2. 컨트롤러 로더 찾기
  const controllerLoader = controllers[controllerKey];

  if (!controllerKey || !controllerLoader) {
    console.warn(`⚠️ 404 Not Found: ${path}`);
    return res.status(404).send('Not Found');
  }

  try {
    // 3. [지연 로딩 실행]
   
    const controller = controllerLoader();

    // 4. 컨트롤러 실행
    if (typeof controller === 'function') {
      return await controller(req, res);
    } else if (typeof controller.default === 'function') {
      return await controller.default(req, res);
    } else if (typeof controller.handler === 'function') {
      return await controller.handler(req, res);
    } else {
      throw new Error(`Controller [${controllerKey}] is not a function`);
    }

  } catch (error) {
    console.error(`❌ Critical Error in ${controllerKey}:`, error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};
