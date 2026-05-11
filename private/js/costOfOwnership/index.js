/**
 * Cost of ownership page — collect form values, POST `/api/cost-of-ownership`, show monthly estimate.
 */

const { POST } = require(`../components/rest`)
const {
   displayErrors,
   clearErrorMessages,
} = require(`../components/errorHandling`)
const {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
} = require(`../components/buttonLoadingState`)

require(`../components/mainNavBar`)

const $submitButton = $(`#costOfOwnershipSubmit`)
const $purchasePrice = $(`#purchasePrice`)
const $downpaymentPercent = $(`#downpaymentPercent`)
const $loanPrincipal = $(`#loanPrincipal`)
const $annualInterestRatePercent = $(`#annualInterestRatePercent`)
const $loanTermYears = $(`#loanTermYears`)
const $annualMunicipalTax = $(`#annualMunicipalTax`)
const $annualSchoolTax = $(`#annualSchoolTax`)
const $annualInsurance = $(`#annualInsurance`)
const $annualInsuranceTimes12 = $(`#annualInsuranceTimes12`)
const $annualMaintenance = $(`#annualMaintenance`)
const $resultSection = $(`#costResultSection`)
const $monthlyCostValue = $(`#monthlyCostValue`)

function formatMoneyCadTwoDecimals(amount) {
   return new Intl.NumberFormat(`en-CA`, {
      style: `currency`,
      currency: `CAD`,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   }).format(amount)
}

/**
 * @param {string} raw
 * @returns {number|null} Parsed finite number, or `null` when empty / whitespace.
 */
function parseOptionalDecimalInput(raw) {
   const trimmed = String(raw ?? ``).trim()
   if (trimmed === ``) {
      return null
   }
   const value = Number.parseFloat(trimmed)
   return Number.isFinite(value) ? value : Number.NaN
}

function handleAnnualInsuranceTimes12Click() {
   clearErrorMessages()
   const monthlyAmount = Number.parseFloat(String($annualInsurance.val()).trim())
   if (!Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
      displayErrors({
         type: `CUSTOM`,
         name: `Insurance`,
         message: `Enter a monthly insurance amount (zero or greater), then press x12.`,
      })
      return
   }
   const annualRoundedCents = Math.round(monthlyAmount * 12 * 100) / 100
   $annualInsurance.val(String(annualRoundedCents))
}

function buildRequestPayloadFromForm() {
   const purchasePrice = Number.parseFloat(String($purchasePrice.val()).trim())
   if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      throw {
         type: `CUSTOM`,
         name: `Purchase price`,
         message: `Enter a valid purchase price greater than zero.`,
      }
   }

   const payload = { purchasePrice }

   const downpaymentPercent = parseOptionalDecimalInput($downpaymentPercent.val())
   if (downpaymentPercent !== null) {
      if (!Number.isFinite(downpaymentPercent) || downpaymentPercent < 0 || downpaymentPercent > 100) {
         throw {
            type: `CUSTOM`,
            name: `Down payment`,
            message: `Down payment must be between 0 and 100 percent.`,
         }
      }
      payload.downpaymentPercentage = downpaymentPercent / 100
   }

   const loanPrincipal = parseOptionalDecimalInput($loanPrincipal.val())
   if (loanPrincipal !== null) {
      if (!Number.isFinite(loanPrincipal) || loanPrincipal < 0) {
         throw {
            type: `CUSTOM`,
            name: `Loan principal`,
            message: `Loan principal must be a non-negative number.`,
         }
      }
      payload.loanPrincipal = loanPrincipal
   }

   const interestPercent = parseOptionalDecimalInput($annualInterestRatePercent.val())
   if (interestPercent !== null) {
      if (!Number.isFinite(interestPercent) || interestPercent < 0) {
         throw {
            type: `CUSTOM`,
            name: `Interest rate`,
            message: `Interest rate must be zero or positive.`,
         }
      }
      payload.loanInterestRate = interestPercent / 100
   }

   const loanTermYears = parseOptionalDecimalInput($loanTermYears.val())
   if (loanTermYears !== null) {
      if (!Number.isFinite(loanTermYears) || loanTermYears <= 0) {
         throw {
            type: `CUSTOM`,
            name: `Loan term`,
            message: `Amortization in years must be greater than zero when provided.`,
         }
      }
      payload.loanTerm = loanTermYears
   }

   for (const [fieldId, key] of [
      [$annualMunicipalTax, `annualMunicipalTax`],
      [$annualSchoolTax, `annualSchoolTax`],
      [$annualInsurance, `annualInsurance`],
      [$annualMaintenance, `annualMaintenance`],
   ]) {
      const annualAmount = parseOptionalDecimalInput(fieldId.val())
      if (annualAmount !== null) {
         if (!Number.isFinite(annualAmount) || annualAmount < 0) {
            throw {
               type: `CUSTOM`,
               name: `Annual amount`,
               message: `Annual tax and cost fields must be non-negative numbers.`,
            }
         }
         payload[key] = annualAmount
      }
   }

   return payload
}

async function handleCostOfOwnershipSubmit() {
   clearErrorMessages()
   setButtonLoadingState($submitButton, `Calculating...`)

   let requestPayload
   try {
      requestPayload = buildRequestPayloadFromForm()
   } catch (validationError) {
      displayErrors(validationError)
      restoreButtonFromLoadingState($submitButton)
      return
   }

   try {
      const responseData = await POST(`/api/cost-of-ownership`, requestPayload, { goToRedirect: false })
      const monthlyTotal = responseData?.monthlyCostOfOwnership
      if (!Number.isFinite(monthlyTotal)) {
         throw {
            type: `CUSTOM`,
            name: `Response`,
            message: `The server response did not include a valid monthly total.`,
         }
      }
      $monthlyCostValue.text(formatMoneyCadTwoDecimals(monthlyTotal))
      $resultSection.removeClass(`d-none`)
      restoreButtonFromLoadingState($submitButton)
   } catch (requestError) {
      displayErrors(requestError)
      restoreButtonFromLoadingState($submitButton)
   }
}

$submitButton.on(`click`, handleCostOfOwnershipSubmit)
$annualInsuranceTimes12.on(`click`, handleAnnualInsuranceTimes12Click)
