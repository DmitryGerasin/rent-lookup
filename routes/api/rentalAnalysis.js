/**
 * POST `/api/rental-analysis` — geocode address (QC), fetch rental registry bbox, aggregate averages.
 */

const errHandling = require('../errorHandling')
const { clampRegistryBboxScale } = require('../../config/rentalAnalysis')
const { getAddressCoordinates } = require('../../models/geoCode')
const { getHousings } = require('../../models/rentalRegistry')
const { processData } = require('../../models/processData')
const router = require('express').Router()

router.post('/', postRentalAnalysis)

module.exports = router

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function postRentalAnalysis(req, res) {
   try {
      const street = typeof req.body?.street === 'string' ? req.body.street.trim() : ''
      const city = typeof req.body?.city === 'string' ? req.body.city.trim() : ''
      const postalCode =
         typeof req.body?.postalCode === 'string' ? req.body.postalCode.trim() : ''

      if (!street || !city) {
         throw {
            type: 'CUSTOM',
            name: 'Required fields',
            message: 'Street address and city are required.',
         }
      }

      const scale = clampRegistryBboxScale(req.body?.scale)

      const geocode = await getAddressCoordinates(street, city, postalCode)
      const registry = await getHousings(
         { lat: geocode.lat, lng: geocode.lng },
         scale,
      )
      if (registry?.status && registry.status !== 'success') {
         throw {
            type: 'CUSTOM',
            name: 'Rental registry',
            message: `The registry responded with status "${registry.status}".`,
         }
      }
      const summary = processData(registry)

      return res.send({
         ok: true,
         data: {
            geocode: {
               lat: geocode.lat,
               lng: geocode.lng,
               formatted_address: geocode.formatted_address ?? null,
               warnings: geocode.warnings ?? [],
            },
            summary,
            registryStatus: registry?.status ?? null,
         },
      })
   } catch (err) {
      if (err?.type === 'CUSTOM') {
         return errHandling(req, res, err, __filename, 'postRentalAnalysis', 'JSON')
      }
      return errHandling(
         req,
         res,
         {
            type: 'CUSTOM',
            name: 'Analysis failed',
            message: err?.message || 'Could not complete the request.',
         },
         __filename,
         'postRentalAnalysis',
         'JSON',
      )
   }
}
