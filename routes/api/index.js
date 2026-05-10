/**
 * JSON API mounted at `/api` (see `routes/index.js`).
 * Sub-routers: invites, file, person, lawyer, time, dragon, csrf-token.
 */

const router = require('express').Router()

router.use('/csrf-token', require('./csrf'))
router.use('/rental-analysis', require('./rentalAnalysis'))

module.exports = router
