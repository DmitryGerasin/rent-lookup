const { doubleCsrf }    = require('csrf-csrf')
const {
   PRODUCTION,
   NODE_PORT,
   PUBLIC_BASE_URL,
   CSRF_SECRET,
}                       = require(`../config`)

/**
 * Ensure a request has an allowed origin.
 * Falls back to Referer origin because browsers may omit Origin on same-origin GET requests.
 */
const ensureAllowedOrigin = (req, res, next) => {
   const allowedOrigins = PRODUCTION ? new Set([
      PUBLIC_BASE_URL,
   ]) : new Set([
      `http://localhost:${NODE_PORT}`,
      `http://127.0.0.1:${NODE_PORT}`,
   ])
   const getRefererOrigin = () => {
      const referer = req.headers.referer
      if (!referer) return null

      try {
         return new URL(referer).origin
      } catch (err) {
         return null
      }
   }

   // If the origin is not allowed, return a 403 Forbidden error
   const origin = req.headers.origin || getRefererOrigin()
   if (!origin) return res.sendStatus(403)

   if (!allowedOrigins.has(origin)) return res.sendStatus(403)

   next()
}

/**
 * Ensure all state-changing requests (POST, PUT, PATCH, DELETE) have an allowed origin.
 */
const ensureAllowdOriginOnStateChangeRequest = (req, res, next) => {
   if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next()
   return ensureAllowedOrigin(req, res, next)
}

const doubleCsrfUtilities = doubleCsrf({
   getSecret: () => CSRF_SECRET,
   getSessionIdentifier: (req) => req.session.id, // A function that returns the unique identifier for the request
   // __Host- prefix requires Secure; use a plain name in development over HTTP.
   cookieName: PRODUCTION ? `__Host-psifi.x-csrf-token` : `psifi.x-csrf-token`,
   cookieOptions: {
      sameSite: "strict",
      path: "/",
      secure: PRODUCTION ? true : false,
      httpOnly: true,     // JS cannot access it
   },
   size: 64,
   ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
   getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request.
   skipCsrfProtection: undefined,
})

const generateCsrfToken = (req, res, options) => {
   return doubleCsrfUtilities.generateCsrfToken(req, res, options)
}

const addCsrfTokenToLocals = (req, res, next) => {
   res.locals.csrfToken = generateCsrfToken(req, res)
   next()
}

const handleInvalidCsrfTokenError = (err, req, res) => {
   if (
      err.name !== 'ForbiddenError' ||
      !err.message.includes('csrf')
   ) return false

   res.status(403).json({
      ok: false,
      code: 'CSRF_INVALID',
      message: 'Invalid CSRF token',
      error: {
         name: 'Invalid CSRF token',
         message: 'Invalid CSRF token',
         type: 'NON-CUSTOM',
         code: 'CSRF_INVALID',
      },
   })
   return true
}

module.exports = {
   ensureAllowedOrigin,
   ensureAllowdOriginOnStateChangeRequest,
   generateCsrfToken,
   addCsrfTokenToLocals,
   handleInvalidCsrfTokenError,
   doubleCsrfProtection: doubleCsrfUtilities.doubleCsrfProtection,
   invalidCsrfTokenError: doubleCsrfUtilities.invalidCsrfTokenError,
}