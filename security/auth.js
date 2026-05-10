const {
   DEVELOPMENT,
   BYPASS_AUTH_IN_DEV,
   appHomePage,
   POST_LOGIN_REDIRECT_EXEMPTIONS,
}                       = require(`../config`)
const {
   safeReturnPath,
}                       = require(`./safeReturnPath`)

/**
 * Decide what to store in `req.session.redirectTo` when an unauthenticated user is
 * about to be sent to the login page.
 *
 * Exempt URLs (API, static, `/users/login`, etc. — see `POST_LOGIN_REDIRECT_EXEMPTIONS` in config) normally map
 * to `appHomePage`. If the session already holds a valid in-app return path, **never
 * overwrite it** on an exempt request — otherwise a secondary request (e.g. DevTools
 * fetching a non-existent `*.js.map` that falls through to `ensureAuthenticated`)
 * would clobber the real post-login target.
 *
 * @param {string} originalUrl
 * @param {unknown} existingRedirectTo
 * @returns {string}
 */
function resolveRedirectToForUnauthenticatedRedirect(originalUrl, existingRedirectTo) {
   const url = typeof originalUrl === `string` ? originalUrl : ``
   const isExempt = POST_LOGIN_REDIRECT_EXEMPTIONS.some((re) => re.test(url))
   if (isExempt) {
      if (existingRedirectTo !== undefined && existingRedirectTo !== null) {
         const trimmed = String(existingRedirectTo).trim()
         if (trimmed !== ``) {
            const preserved = safeReturnPath(existingRedirectTo, { decode: false })
            if (preserved !== appHomePage) return preserved
         }
      }
      return appHomePage
   }
   return safeReturnPath(url)
}

module.exports = {
   resolveRedirectToForUnauthenticatedRedirect,

   ensureAuthenticated: function (req, res, next) {
      if (
         req.isAuthenticated() ||
         (DEVELOPMENT && BYPASS_AUTH_IN_DEV)
      ) return next()

      req.flash(`warning`, `Veuillez vous connecter pour accéder à cette ressource.`)

      const existing = req.session.redirectTo
      req.session.redirectTo = resolveRedirectToForUnauthenticatedRedirect( req.originalUrl, existing )

      // Force session to be saved before redirecting, otherwise `flash` and `redirectTo` don't get passed on some of the time
      req.session.save(() => {
         return res.redirect(`/users/login`)
      })
   },

   ensureNotAuthenticated: function (req, res, next) {
      if (!req.isAuthenticated()) return next()

      return res.redirect(appHomePage)
   },
}
