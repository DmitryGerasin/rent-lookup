const errHandling = require(`./errorHandling`)
const {
   appName,
   appNameLong,
   rentalAnalysis,
} = require(`../config`)
const router = require(`express`).Router()

router.get(`/`, getRentAnalysis)

module.exports = router

/**
 * GET `/rent-analysis` — Rent analysis: address form + client-side registry analysis (see `rentAnalysis.bundle.js`).
 */
async function getRentAnalysis(req, res) {
   try {
      const user = req.user
      res.render(`./rentAnalysis/index`, {
         appName,
         appNameLong,
         companyName: appNameLong,
         pageTitle: `Rent analysis`,
         current: `rent-analysis`,
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
      return errHandling(req, res, err, __filename, `getRentAnalysis`, `HTML`)
   }
}
