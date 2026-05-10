require('dotenv').config({ quiet: true })
const {
   PRODUCTION,
   USE_LOG_REQUEST_IN_DEVELOPMENT,
   EXPRESS_SESSION_SECRET,
   EXPRESS_SESSION_KEY,
   NODE_PORT,
   // sessionTimeout,
   REQUEST_BODY_LIMIT,
}                       = require(`./config`)
const express           = require(`express`)
const cookieParser      = require(`cookie-parser`)
   const app            = express()
const flash             = require('connect-flash')
const http              = require(`http`)
const passport          = require(`passport`)
const {
   ensureIPWhitelisted,
   helmetConfig,
   logRequest,
   generalLimiter,
   csrf,
}                       = require(`./security`)
const mountPublicStatic = require(`./middleware/mountPublicStatic`)
const {
   globalErrorHandler,
}                       = require('./middleware/globalErrorHandler')
const session           = require(`express-session`)
// const MySQLStore        = require(`express-mysql-session`)(session)
const { timeStamp }     = require(`./utils/timeStamp`)

// 1. Set security headers before any middleware that can respond

// Disable the X-Powered-By header to prevent fingerprinting
app.disable('x-powered-by')

// If the app is behind a reverse proxy (e.g. nginx), set the trust proxy to 1
if(PRODUCTION) app.set('trust proxy', 1)

// Helmet (CSP, crossOriginResourcePolicy, hsts, etc.)
app.use(helmetConfig)

// 2. Check if the request is allowed (before bodyparser)
app.use(ensureIPWhitelisted) // Ensure IP is whitelisted
app.use(csrf.ensureAllowdOriginOnStateChangeRequest) // Ensure allowed origin on all state-changing requests
   
// 3. Bodyparser (limit the size of the request body to 50kb to prevent DOS attacks)
app.use(express.urlencoded({ extended: false, limit: REQUEST_BODY_LIMIT })) // 413 Entity Too Large on fail
app.use(express.json({ limit: REQUEST_BODY_LIMIT })) // 413 Entity Too Large on fail

// 4. Public static assets (+ short-circuit missing *.map probes before the app router)
app.use(mountPublicStatic)

// 5. Express session
// Create a new instance of the session store
// const sqlSessionStore = new MySQLStore({
//    expiration: sessionTimeout,
//    createDatabaseTable: true,       // Automatically create the sessions table if it doesn't exist
// }, mainPool)

app.use(session({
   name: EXPRESS_SESSION_KEY, // name of the session cookie, meant to prevent express fingerprinting
   secret: EXPRESS_SESSION_SECRET, // secret to sign the session id cookie
   resave: false, // do not resave session if nothing has changed
   saveUninitialized: false, // do not save uninitialized session
   cookie: { 
      // Protects against XSS attacks stealing cookies (cookies inaccessible to javascript)
      httpOnly: true,

      // Cookies are only sent over HTTPS in production, with `trust proxy` set 
      // to 1 (App is behind nginx). In development, cookies are sent over HTTP 
      // to http://localhost:${PORT}
      secure: PRODUCTION ? true : false,

      // When set to 'strict': if a user clicks a link to the site from an email 
      // or another website, they will appear logged out until they refresh or click 
      // a link within the site.
      sameSite: 'lax',
   },
   // store: sqlSessionStore,
}))

// 6. Passport middleware. (must be after the express session middleware)
require('./security/passport')(passport)  // Passport config
app.use(passport.initialize())
app.use(passport.session())

// 7. Security measures that require req.user to be set (must be after passport middleware)
app.use(generalLimiter) // Rate limiter
if(PRODUCTION || USE_LOG_REQUEST_IN_DEVELOPMENT) app.use(logRequest) // Log requests

// 8. Connect flash
app.use(flash())
app.use((req, res, next) => {

   /**
    * HOW TO USE FLASH MESSAGES:
    * req.flash('primary', 'This is a primary alert')
    * req.flash('secondary', 'This is a secondary alert')
    * req.flash('success', 'This is a success alert')
    * req.flash('warning', 'This is a warning alert')
    * etc.
    * 
    * When receiving a request in response to which a flash message needs to be displayed,
    * the message should be added to the request object using `req.flash('primary', 'This is a primary alert')`.
    * The message will then be available in the response using `res.locals.alert_primary`.
    * The message will be displayed in the view using `alert_primary`.
    * 
    * See `views/partials/messages.ejs` for how to display the messages.
    */

   // Flash messages
   res.locals.alert_primary    = req.flash('primary')
   res.locals.alert_secondary  = req.flash('secondary')
   res.locals.alert_success    = req.flash('success')
   res.locals.alert_warning    = req.flash('warning')
   res.locals.alert_danger     = req.flash('danger')
   res.locals.alert_info       = req.flash('info')
   res.locals.alert_light      = req.flash('light')
   res.locals.alert_dark       = req.flash('dark')

   // Message when passport cannot authenticate (wrong password)
   res.locals.error = req.flash('error')

   next()
})

// 9. Cookie header → req.cookies (required by csrf-csrf double-submit middleware, must be after session middleware, before csrf protection)
app.use(cookieParser())

// 10. EJS
app.set('view engine', 'ejs')

// 12. CSRF protection
// Protects against CSRF attacks (must be after session middleware)
app.use(csrf.doubleCsrfProtection)

// Set the CSRF token in the response locals (must be after session middleware and after CSRF protection)
app.use(csrf.addCsrfTokenToLocals) 

// 13. Router
app.use(require(`./routes/index`))

// 14. Global error handling (must be after routes and before server start)
app.use(globalErrorHandler)

// 15. Start server (only listens to 127.0.0.1 (nginx) to prevent direct access via port 8080)
http.createServer(app).listen(NODE_PORT, `127.0.0.1`, () => { 
   console.log(`${timeStamp()} HTTP Server running on port ${NODE_PORT}`)
})
