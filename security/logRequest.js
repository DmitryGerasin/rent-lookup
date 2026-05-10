const { timeStamp }     = require(`../utils/timeStamp`)
const {
   HOSTNAME,
   PRODUCTION,
   DEVELOPMENT,
   NODE_PORT,
   LOG_REQUEST_EXEMPTIONS,
}                       = require(`../config`)

// See: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

/**
 * Query parameter names whose values must never appear in access logs (URLs, `_Request.query`, stdout).
 * Registration uses `t` for the invitation token. When adding secrets in the query string, add the key here
 * and document in `routes/router-reference.md` ("HTTP access logging").
 */
const QUERY_KEYS_NEVER_LOG = new Set([
   `t`,
   `token`,
])

/**
 * Body keys omitted from `_Request.body` / stdout (passwords, tokens, captcha, etc.).
 * When adding JSON/form fields that are secrets, add the key here and document in `routes/router-reference.md`.
 */
const BODY_KEYS_NEVER_LOG = new Set([
   `password`,
   `password2`,
   `g-recaptcha-response`,
   `token`,
])

/**
 * @param {Record<string, unknown>} query
 * @returns {Record<string, unknown>}
 */
const sanitizeQueryForLog = (query) => {
   if (!query || typeof query !== `object`) return {}
   const out = { ...query }
   for (const key of QUERY_KEYS_NEVER_LOG) {
      if (Object.prototype.hasOwnProperty.call(out, key) && out[key] != null && String(out[key]) !== ``) {
         out[key] = `[REDACTED]`
      }
   }
   return out
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
const sanitizeBodyForLog = (body) => {
   if (!body || typeof body !== `object`) return {}
   const out = { ...body }
   for (const key of BODY_KEYS_NEVER_LOG) {
      delete out[key]
   }
   return out
}

/**
 * Strip sensitive query params from the path+query used in log text and `_Request.originalUrl`,
 * so invitation links are not persisted or printed in full.
 *
 * @param {string} originalUrl
 * @returns {string}
 */
const sanitizeOriginalUrlForLog = (originalUrl) => {
   if (!originalUrl || typeof originalUrl !== `string`) return originalUrl
   try {
      const u = new URL(originalUrl, `http://localhost`)
      let changed = false
      for (const key of QUERY_KEYS_NEVER_LOG) {
         if (u.searchParams.has(key)) {
            u.searchParams.set(key, `[REDACTED]`)
            changed = true
         }
      }
      if (!changed) return originalUrl
      return `${u.pathname}${u.search}`
   } catch {
      return originalUrl
   }
}

const normalizeIp = (ip = ``) => String(ip).replace(/^::ffff:/, ``)

const logRequest = (req, res, next) => {

   const originalUrl = typeof req.originalUrl === `string` ? req.originalUrl : ``
   // If the request matches any log exemption regex, do not log it to the database.
   if (LOG_REQUEST_EXEMPTIONS.some((re) => re.test(originalUrl))) return next()

   // In production, req.ip comes from trust proxy + X-Forwarded-For.
   // In development, use the direct socket address.
   // res.locals.clientIp is set by IPwhitelist.js
   const clientIp = normalizeIp(
      res.locals.clientIp ||
      (PRODUCTION ? req.ip : req.socket?.remoteAddress || ``)
   )

   const urlForLog = sanitizeOriginalUrlForLog(req.originalUrl)
   const queryForLog = sanitizeQueryForLog(req.query)
   const bodyForLog = sanitizeBodyForLog(req.body || {})

   let result = `${timeStamp()}, [${clientIp}|${res.locals.ipAddressBelongsTo || `null`}|`

   if (!req.user) {
      // not an authenticated user
      result += `null]`
   } else {
      // authenticated
      result += `${req.user.firstName} ${req.user.lastName}]`
   }

   if (
      (
         PRODUCTION && 
         req.hostname === HOSTNAME && 
         req.headers.host === HOSTNAME
      ) || (
         DEVELOPMENT 
         && [`localhost`, `127.0.0.1`].includes(req.hostname) 
         && [`localhost:${NODE_PORT}`, `127.0.0.1:${NODE_PORT}`].includes(req.headers.host)
      )
   ) {
      // all good
      result += ` ${req.method}:${urlForLog}`
   } else {
      // ALERT! Possibly a cross-site request
      console.error(`${timeStamp()} *** ALERT! ***`)
      result += `, ${req.hostname} -> ${req.method}: ${req.headers.host}${urlForLog}`
   }

   // @TODO logRequest runs before the response is finished: `req.statusCode` / `req.statusMessage` here are often
   // still the defaults, not the final values sent to the client. Refactor (e.g. `res.on('finish', ...)`) if you
   // need accurate status codes in `_Request` / forensics without changing semantics elsewhere.

   console.log(result)
   if (JSON.stringify(queryForLog) !== JSON.stringify({})) console.log(queryForLog)
   if (JSON.stringify(bodyForLog) !== JSON.stringify({})) console.log(bodyForLog)

   const accessData = {
      ip:            `${clientIp}`,
      ipName:        `${res.locals.ipAddressBelongsTo || `null`}`,
      userId:        !req.user ? 0 : req.user.userID,
      hostname:      req.hostname,
      method:        req.method,
      host:          req.headers.host,
      originalUrl:   urlForLog,
      query:         JSON.stringify(queryForLog),
      body:          JSON.stringify(bodyForLog),
   }
   // Do not await: avoid adding latency to the response. Handle rejections so failed inserts do not become unhandled rejections.
   // sql.save(accessData).catch((err) => {
   //    console.error(`${timeStamp()} security/logRequest.js: sql.save(accessData) failed`, err)
   // })

   next()
}

module.exports = logRequest
