const errHandling = require(`./errorHandling`)
const {
   appName,
   appNameLong,
   rentalAnalysis,
} = require(`../config`)
const router = require(`express`).Router()

router.get(`/`, getDashboard)

module.exports = router

/**
 * GET `/dashboard` — address form + client-side analysis (see `dashboard.bundle.js`).
 */
async function getDashboard(req, res) {
   try {
      const user = req.user
      res.render(`./dashboard/index`, {
         appName,
         appNameLong,
         companyName: appNameLong,
         pageTitle: `Rent analysis`,
         firstName: user?.firstName ?? ``,
         lastName: user?.lastName ?? ``,
         isAdmin: user?.category === `admin`,
         user: user ?? null,
         registrySearchBoxEdgeMin: rentalAnalysis.REGISTRY_SEARCH_BOX_EDGE_METERS_MIN,
         registrySearchBoxEdgeMax: rentalAnalysis.REGISTRY_SEARCH_BOX_EDGE_METERS_MAX,
         registrySearchBoxEdgeStep: rentalAnalysis.REGISTRY_SEARCH_BOX_EDGE_METERS_STEP,
         registrySearchBoxEdgeDefault: rentalAnalysis.REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT,
         rentalAnalysis,
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, `getDashboard`, `HTML`)
   }
}
