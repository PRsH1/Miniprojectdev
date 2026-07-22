const PROTECTED_PAGES = {
  memberV2: {
    passwordEnv: 'MEMBER_PAGE_PASSWORD',
    cookieName: 'vercel-auth-member',
    defaultNext: '/memberV2',
    filePath: 'private/MemberV2.html',
    errorLabel: 'MemberV2',
  },
  templatecopy: {
    passwordEnv: 'TEMPLATECOPY_PAGE_PASSWORD',
    cookieName: 'vercel-auth-templatecopy',
    defaultNext: '/templatecopy',
    filePath: 'private/templatecopy.html',
    errorLabel: 'templatecopy',
  },
  idptestauth: {
    passwordEnv: 'IDP_TEST_PAGE_PASSWORD',
    cookieName: 'vercel-auth-idp-test',
    defaultNext: '/idptestauth',
    filePath: 'private/idp-test.html',
    errorLabel: 'IDP Test',
  },
};

module.exports = { PROTECTED_PAGES };
