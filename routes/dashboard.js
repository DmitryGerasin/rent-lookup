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
         registryBboxScaleMin: rentalAnalysis.REGISTRY_BBOX_SCALE_MIN,
         registryBboxScaleMax: rentalAnalysis.REGISTRY_BBOX_SCALE_MAX,
         registryBboxScaleStep: rentalAnalysis.REGISTRY_BBOX_SCALE_STEP,
         registryBboxScaleDefault: rentalAnalysis.REGISTRY_BBOX_SCALE_DEFAULT,
         rentalAnalysis,
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, `getDashboard`, `HTML`)
   }
}
