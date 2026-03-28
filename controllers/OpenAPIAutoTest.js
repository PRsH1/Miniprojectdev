const createProtectedPageHandler = require('./_shared/protectedPage');
const { PROTECTED_PAGES } = require('./_shared/protected-pages-config');

module.exports = createProtectedPageHandler({
  ...PROTECTED_PAGES.apiautotest,
  defaultNext: '/OpenAPIAutoTest',
  filePath: 'private/OpenAPIAutoTest.html',
  errorLabel: 'OpenAPIAutoTest',
  scope: 'apiautotest',
});
