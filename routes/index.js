const auth = require(`../security/auth`)
const {
   DEVELOPMENT,
   BYPASS_AUTH_IN_DEV,
   appHomePage,
} = require(`../config`)
const errorCodes = require(`../middleware/errorCodes`)
const router = require(`express`).Router()

/*============================================================================
= = = = = = = = = = = = = = = = = = ROUTES = = = = = = = = = = = = = = = = = =
============================================================================*/

router.get(`/`, (req, res) => {
   if (req.isAuthenticated() || (DEVELOPMENT && BYPASS_AUTH_IN_DEV)) {
      return res.redirect(appHomePage)
   }
   return res.redirect(`/users/login`)
})

router.use(`/api`,       auth.ensureAuthenticated,                   require(`./api`))             // JSON API — `routes/api/index.js`
router.use(`/dashboard`, auth.ensureAuthenticated,                   require(`./dashboard`))       // 
router.use(`/users`,                                                 require(`./users`))           // Registration & Authentication

router.use(              auth.ensureAuthenticated,                   (req, res) => errorCodes(res, 404))   // should be last, if no above route corresponds to request

module.exports = router
