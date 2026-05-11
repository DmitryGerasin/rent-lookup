const {
   requireEnv,
   requireNonEmptyEnv,
}                       = require(`../utils/validateEnv`)
const {
   version: APP_VERSION,
}                       = require(`../package.json`)

// Environment
const PRODUCTION = requireEnv('NODE_ENV') === 'production'
const DEVELOPMENT = requireEnv('NODE_ENV') === 'development'

// Hostname and port
const HOSTNAME = requireEnv('HOSTNAME')
const NODE_PORT = requireNonEmptyEnv('NODE_PORT')
const PUBLIC_BASE_URL = HOSTNAME === `localhost`
   ? `http://localhost:${NODE_PORT}`
   : `https://${HOSTNAME}`

/** Bind address for HTTP (`127.0.0.1` locally; `0.0.0.0` in Docker so nginx can reach the app). */
const HTTP_BIND_ADDRESS =
   process.env.HTTP_BIND_ADDRESS !== undefined && String(process.env.HTTP_BIND_ADDRESS).length > 0
      ? process.env.HTTP_BIND_ADDRESS
      : `127.0.0.1`

// Mysql
const MYSQL_HOST = requireNonEmptyEnv('MYSQL_HOST')
const MYSQL_USER = requireNonEmptyEnv('MYSQL_USER')
const MYSQL_PASSWORD = requireNonEmptyEnv('MYSQL_PASSWORD')
const MYSQL_DATABASE = requireNonEmptyEnv('MYSQL_DATABASE')

// Security
const USE_IP_WHITELIST = false
/** Production: nginx reaches Node on 127.0.0.1 (bare metal). Docker: peer is a private bridge IP — set `APP_BEHIND_DOCKER_PROXY=true`. */
const APP_BEHIND_DOCKER_PROXY = process.env.APP_BEHIND_DOCKER_PROXY === `true` // if not set then it is not running in docker
const REGISTRATION_ENABLED = false
const INVITATION_TOKEN_EXPIRY_HOURS = 48
const BYPASS_AUTH_IN_DEV = true
const BYPASS_RBAC_IN_DEV = true
const USE_LOG_REQUEST_IN_DEVELOPMENT = false
const REQUEST_BODY_LIMIT = '50kb'

// Express
const EXPRESS_SESSION_SECRET = requireNonEmptyEnv('EXPRESS_SESSION_SECRET')
const EXPRESS_SESSION_KEY = requireNonEmptyEnv('EXPRESS_SESSION_KEY')
const sessionTimeout = 3 * 60 * 60 * 1000 // 3 hours

// Geocodio
const GEOCODIO_API_KEY = requireNonEmptyEnv('GEOCODIO_API_KEY')
const GEOCODIO_BASE = 'https://api.geocod.io/v1.12'

// CSRF
const CSRF_SECRET = requireNonEmptyEnv('CSRF_SECRET')

// Recaptcha
const RECAPTCHA_SITE_KEY = requireNonEmptyEnv('RECAPTCHA_SITE_KEY')
const RECAPTCHA_SECRET_KEY = requireNonEmptyEnv('RECAPTCHA_SECRET_KEY')

// App
const appHomePage = `/dashboard`
const appName = `Rent Analysis`
const appNameLong = `Rent Analysis Quebec`
const VALID_ROLES = [
   `admin`,
   `user`,
]

/** `express.static` max-age (e.g. production cache). */
const staticFilesMaxAge = PRODUCTION ? `7d` : 0

/**
 * Exceptions to the `logRequest` middleware: if `req.originalUrl` matches **any** of these regexes,
 * the request is not written to the access-log database. Each pattern encodes its own rules (prefix,
 * exact path, query handling, etc.).
 *
 * Update this list in conjunction with `POST_LOGIN_REDIRECT_EXEMPTIONS` when adding new public static routes.
 *
 * @type {RegExp[]}
 */
const LOG_REQUEST_EXEMPTIONS = [
   /^\/css\//, // starts with `/css/`
   /^\/img\//, // starts with `/img/`
   /^\/js\//, // starts with `/js/`
   // /^\/legal\//, // starts with `/legal/`
   // /^\/svg\//, // starts with `/svg/`
   /^\/favicon\.ico(?:\?|$)/, // starts with `/favicon.ico` and ends with a query string or is at the site root
]

const SAFE_RETURN_PATH_PREFIXES = [
   `/dashboard`,
]

/** Rental analysis filters, registry bbox scale, and dashboard chart constants (browser-safe). */
const rentalAnalysis = require(`./rentalAnalysis`)

/**
 * URLs that should not overwrite `session.redirectTo` with the raw request path when unauthenticated
 * (static assets, API probes, login page, etc.).
 *
 * @type {RegExp[]}
 */
const POST_LOGIN_REDIRECT_EXEMPTIONS = [
   /^\/css\//,
   /^\/js\//,
   /^\/img\//,
   /^\/favicon\.ico(?:\?|$)/,
   /^\/users\/login(?:\?|$)/,
   /^\/api\//,
]

module.exports = {
   APP_VERSION,
   PRODUCTION,
   DEVELOPMENT,
   HOSTNAME,
   EXPRESS_SESSION_SECRET,
   EXPRESS_SESSION_KEY,
   NODE_PORT,
   HTTP_BIND_ADDRESS,
   LOG_REQUEST_EXEMPTIONS,
   POST_LOGIN_REDIRECT_EXEMPTIONS,
   USE_IP_WHITELIST,
   APP_BEHIND_DOCKER_PROXY,
   USE_LOG_REQUEST_IN_DEVELOPMENT,
   REQUEST_BODY_LIMIT,
   GEOCODIO_API_KEY,
   GEOCODIO_BASE,
   PUBLIC_BASE_URL,
   CSRF_SECRET,
   REGISTRATION_ENABLED,
   INVITATION_TOKEN_EXPIRY_HOURS,
   BYPASS_AUTH_IN_DEV,
   BYPASS_RBAC_IN_DEV,
   appHomePage,
   appName,
   appNameLong,
   SAFE_RETURN_PATH_PREFIXES,
   staticFilesMaxAge,
   MYSQL_HOST,
   MYSQL_USER,
   MYSQL_PASSWORD,
   MYSQL_DATABASE,
   VALID_ROLES,
   RECAPTCHA_SITE_KEY,
   RECAPTCHA_SECRET_KEY,
   rentalAnalysis,
   sessionTimeout,
}