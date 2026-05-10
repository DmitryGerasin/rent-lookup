/**
 * 
 * @param {object} res 
 * @param {string} errorCode 
 * @param {string} errorMessage 
 * @param {*} errorTitle 
 * @param {*} pageTitle 
 */
module.exports = (res, errorCode = 500, errorMessage, errorTitle, pageTitle) => {
   res.status(errorCode)

   const pageContents = {
      errorCode: errorCode,
      pageTitle: typeof pageTitle === `undefined` ? errorCode : pageTitle
   }

   switch (errorCode) {
      case 400:
         pageContents.errorTitle = errorTitle || `Invalid request (400)`
         pageContents.errorMessage = errorMessage || `Invalid request`
         break;

      case 401:
         pageContents.errorTitle = errorTitle || `Unauthorized (401)`,
         pageContents.errorMessage = errorMessage || `You have not been authenticated and cannot view this resource`
         break;

      case 403:
         pageContents.errorTitle = errorTitle || `Forbidden (403)`,
         pageContents.errorMessage = errorMessage || `You do not have access to this file or document`
         break;

      case 404:
         pageContents.errorTitle = errorTitle || `Not found (404)`,
         pageContents.errorMessage = errorMessage || `Page not found `
         break;

      default:
         pageContents.errorTitle = errorTitle || `Internal server error (500)`,
         pageContents.errorMessage = errorMessage || ``
         break;
   }

   res.render(`error`, {
      useLayout: false,
      ...pageContents,
   })
}