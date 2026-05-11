const errHandling = require(`./errorHandling`)
const {
   appName,
   appNameLong,
} = require(`../config`)
const router = require(`express`).Router()

router.get(`/`, getCostOfOwnershipPage)

module.exports = router

/**
 * GET `/cost-of-ownership` — form to estimate monthly cost of ownership (see `costOfOwnership.bundle.js`).
 */
async function getCostOfOwnershipPage(req, res) {
   try {
      const user = req.user
      res.render(`./costOfOwnership/index`, {
         appName,
         appNameLong,
         companyName: appNameLong,
         pageTitle: `Cost of ownership`,
         firstName: user?.firstName ?? ``,
         lastName: user?.lastName ?? ``,
         current: `cost-of-ownership`,
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, `getCostOfOwnershipPage`, `HTML`)
   }
}
