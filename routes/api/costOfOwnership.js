/**
 * POST `/api/cost-of-ownership` — estimate monthly carrying cost (mortgage + taxes, insurance, maintenance).
 */

const errHandling = require(`../errorHandling`)
const { monthlyCostOfOwnership } = require(`../../models/costOfOwnership`)
const router = require(`express`).Router()

router.post(`/`, postCostOfOwnershipEstimate)

module.exports = router

/**
 * @param {unknown} value
 * @returns {number|null} `null` when the value is absent; otherwise a finite number ≥ 0.
 */
function parseOptionalNonNegativeNumber(value) {
   if (value === null || value === undefined || value === ``) {
      return null
   }
   const parsed = Number(value)
   if (!Number.isFinite(parsed)) {
      throw {
         type: `CUSTOM`,
         name: `Invalid number`,
         message: `One of the optional fields is not a valid number.`,
      }
   }
   if (parsed < 0) {
      throw {
         type: `CUSTOM`,
         name: `Invalid number`,
         message: `Values cannot be negative.`,
      }
   }
   return parsed
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function postCostOfOwnershipEstimate(req, res) {
   try {
      const purchasePrice = Number(req.body?.purchasePrice)
      if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
         throw {
            type: `CUSTOM`,
            name: `Purchase price`,
            message: `Purchase price is required and must be a positive number.`,
         }
      }

      const options = {}

      const downpaymentPercentage = parseOptionalNonNegativeNumber(req.body?.downpaymentPercentage)
      if (downpaymentPercentage !== null) {
         if (downpaymentPercentage > 1) {
            throw {
               type: `CUSTOM`,
               name: `Down payment`,
               message: `Down payment must be a fraction between 0 and 1 (for example 0.2 for 20%).`,
            }
         }
         options.downpaymentPercentage = downpaymentPercentage
      }

      const loanPrincipal = parseOptionalNonNegativeNumber(req.body?.loanPrincipal)
      if (loanPrincipal !== null) {
         options.loanPrincipal = loanPrincipal
      }

      const loanInterestRate = parseOptionalNonNegativeNumber(req.body?.loanInterestRate)
      if (loanInterestRate !== null) {
         if (loanInterestRate >= 1) {
            throw {
               type: `CUSTOM`,
               name: `Interest rate`,
               message: `Use an annual nominal rate as a decimal (for example 0.0475 for 4.75%), not a whole percent.`,
            }
         }
         options.loanInterestRate = loanInterestRate
      }

      const loanTerm = parseOptionalNonNegativeNumber(req.body?.loanTerm)
      if (loanTerm !== null) {
         if (loanTerm <= 0) {
            throw {
               type: `CUSTOM`,
               name: `Loan term`,
               message: `Loan term in years must be greater than zero when provided.`,
            }
         }
         options.loanTerm = loanTerm
      }

      for (const key of [
         `annualMunicipalTax`,
         `annualSchoolTax`,
         `annualInsurance`,
         `annualMaintenance`,
      ]) {
         const annualAmount = parseOptionalNonNegativeNumber(req.body?.[key])
         if (annualAmount !== null) {
            options[key] = annualAmount
         }
      }

      let monthlyCost
      try {
         monthlyCost = monthlyCostOfOwnership(purchasePrice, options)
      } catch (modelErr) {
         if (modelErr instanceof TypeError) {
            throw {
               type: `CUSTOM`,
               name: `Validation`,
               message: modelErr.message,
            }
         }
         throw modelErr
      }

      return res.send({
         ok: true,
         data: {
            monthlyCostOfOwnership: monthlyCost,
            purchasePrice,
            optionsUsed: options,
         },
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, `postCostOfOwnershipEstimate`, `JSON`)
   }
}
