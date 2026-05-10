const errorCodes        = require(`../middleware/errorCodes`)
const {
   DEVELOPMENT,
   BYPASS_RBAC_IN_DEV,
}                       = require(`../config`)

/** @param {[`admin`|`lawyer`|`notary`|`paralegal`|`secretary`|`unassigned`]} allowedCategories - Array of categories (roles) that are allowed to access this resource */
module.exports = (allowedCategories) => {
   return (req, res, next) => {
      if(DEVELOPMENT && BYPASS_RBAC_IN_DEV) return next()
      
      if(!allowedCategories.includes(req.user.category)) {
         errorCodes(res, 403)
         return
      }

      next()
   }
}