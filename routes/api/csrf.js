/**
 * `/api/csrf-token` — fresh CSRF token for SPA-style refresh
 */

const errHandling       = require('../errorHandling')
const router            = require('express').Router()
const { csrf }          = require('../../security')

/*============================================================================
= = = = = = = = = = = = = = = = = = ROUTES = = = = = = = = = = = = = = = = = =
============================================================================*/

router.get('/', csrf.ensureAllowedOrigin, getCsrfToken)

module.exports = router

/*============================================================================
= = = = = = = = = = = = = = = = = FUNCTIONS = = = = = = = = = = = = = = = = =
============================================================================*/

/**
 * GET `/api/csrf-token` — fresh CSRF token for SPA-style refresh
 */
async function getCsrfToken(req, res) {
   try {
      const csrfToken = csrf.generateCsrfToken(req, res, { overwrite: true })

      // CSRF token responses must not be cached by browsers/proxies.
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate')

      return res.send({
         ok: true,
         data: { csrfToken },
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, `getCsrfToken`, `JSON`)
   }
}
