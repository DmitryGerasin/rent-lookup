/**
 * Estimated monthly cost of ownership: mortgage payment plus taxes, insurance, and maintenance
 * expressed as a monthly cash outflow.
 *
 * Callers must supply {@link monthlyCostOfOwnership}'s `purchasePrice`. Every other field is
 * optional and falls back to generic Quebec-oriented estimates when annual dollar amounts are unknown.
 */

const {
   DEFAULT_LOAN_INTEREST_RATE_DECIMAL,
   DEFAULT_LOAN_TERM_YEARS,
   MUNICIPAL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   SCHOOL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   INSURANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   MAINTENANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
} = require(`../../config/@models/costOfOwnership`)

/**
 * Monthly payment on a fixed-rate, fully amortizing loan (same payment every month until maturity).
 *
 * Uses the standard closed-form: principal × [ monthlyRate × (1 + monthlyRate)^n ] / [ (1 + monthlyRate)^n − 1 ],
 * where `n` is the count of monthly payments. Reported payments from lenders can differ slightly
 * (+0.4% to +0.7% on typical 300k–2M loans) due to rounding, compounding conventions, or fees.
 *
 * @param {number} loanPrincipalDollars Amount borrowed (not purchase price).
 * @param {number} annualNominalRateDecimal Annual rate as a decimal (e.g. 0.0475 for 4.75%).
 * @param {number} amortizationTermYears Loan length in years (converted to number of monthly payments).
 * @returns {number} Payment due each month in the same dollars unit as `loanPrincipalDollars`.
 */
const getMonthlyMortgagePayment = (
   loanPrincipalDollars,
   annualNominalRateDecimal,
   amortizationTermYears,
) => {
   const numberOfMonthlyPayments = amortizationTermYears * 12
   if (numberOfMonthlyPayments <= 0 || loanPrincipalDollars <= 0) {
      return 0
   }

   const monthlyNominalRateDecimal = annualNominalRateDecimal / 12
   if (monthlyNominalRateDecimal === 0) {
      return loanPrincipalDollars / numberOfMonthlyPayments
   }

   const growthFactorPerPayment = (1 + monthlyNominalRateDecimal) ** numberOfMonthlyPayments
   return (
      loanPrincipalDollars
      * (monthlyNominalRateDecimal * growthFactorPerPayment)
      / (growthFactorPerPayment - 1)
   )
}

/**
 * Non-mortgage ownership costs for one month: municipal tax, school tax, insurance, and maintenance.
 *
 * Any annual amount passed as `null` or `undefined` is replaced by a purchase-price-based estimate
 * using the `*_ESTIMATE_FRACTION_OF_PURCHASE_PRICE` constants, then all four annual lines are
 * summed and divided by 12 to get one month’s share.
 *
 * @param {number} purchasePriceDollars Used only to derive defaults for missing annual inputs.
 * @param {number|null|undefined} annualMunicipalTaxDollars
 * @param {number|null|undefined} annualSchoolTaxDollars
 * @param {number|null|undefined} annualInsuranceDollars
 * @param {number|null|undefined} annualMaintenanceDollars
 * @returns {number} Approximate monthly outflow for taxes + insurance + maintenance (no mortgage).
 */
const getEstimatedMonthlyCarryingCostsExcludingMortgage = (
   purchasePriceDollars,
   annualMunicipalTaxDollars,
   annualSchoolTaxDollars,
   annualInsuranceDollars,
   annualMaintenanceDollars,
) => {
   const resolvedAnnualMunicipalTax = annualMunicipalTaxDollars != null
      ? annualMunicipalTaxDollars
      : purchasePriceDollars * MUNICIPAL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE
   const resolvedAnnualSchoolTax = annualSchoolTaxDollars != null
      ? annualSchoolTaxDollars
      : purchasePriceDollars * SCHOOL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE
   const resolvedAnnualInsurance = annualInsuranceDollars != null
      ? annualInsuranceDollars
      : purchasePriceDollars * INSURANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE
   const resolvedAnnualMaintenance = annualMaintenanceDollars != null
      ? annualMaintenanceDollars
      : purchasePriceDollars * MAINTENANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE

   const totalAnnualCarryingCostsExcludingMortgage = (
      resolvedAnnualMunicipalTax
      + resolvedAnnualSchoolTax
      + resolvedAnnualInsurance
      + resolvedAnnualMaintenance
   )
   return totalAnnualCarryingCostsExcludingMortgage / 12
}

/**
 * Total estimated monthly cost of owning the home: scheduled mortgage payment plus monthly share
 * of municipal tax, school tax, insurance, and maintenance.
 *
 * @param {number} purchasePrice Property price in dollars (required). Coerced with `Number(...)`.
 * @param {object} options Optional loan and annual cost overrides; defaults come from `config/@models/costOfOwnership`.
 * @param {number} [options.downpaymentPercentage=0.2] Fraction of price paid up front; used only to infer
 *   financed principal when `loanPrincipal` is omitted.
 * @param {number|null|undefined} [options.loanPrincipal] Dollars borrowed; if omitted, computed as
 *   `purchasePrice × (1 − downpaymentPercentage)`.
 * @param {number|null|undefined} [options.loanInterestRate] Annual nominal rate as a decimal; if omitted,
 *   uses the default from cost-of-ownership config.
 * @param {number|null|undefined} [options.loanTerm] Amortization in years; if omitted, uses config default.
 * @param {number|null|undefined} [options.annualMunicipalTax]
 * @param {number|null|undefined} [options.annualSchoolTax]
 * @param {number|null|undefined} [options.annualInsurance]
 * @param {number|null|undefined} [options.annualMaintenance]
 * @returns {number} Estimated all-in monthly ownership cost in dollars.
 */
const monthlyCostOfOwnership = (purchasePrice, {
   downpaymentPercentage = 0.2,
   loanPrincipal = null,
   loanInterestRate = null,
   loanTerm = null,
   annualMunicipalTax = null,
   annualSchoolTax = null,
   annualInsurance = null,
   annualMaintenance = null,
}) => {
   const purchasePriceDollars = Number(purchasePrice)
   if (!Number.isFinite(purchasePriceDollars) || purchasePriceDollars <= 0) {
      throw new TypeError(
         `monthlyCostOfOwnership: purchasePrice must be a positive finite number`,
      )
   }

   const loanPrincipalDollars = loanPrincipal != null
      ? loanPrincipal
      : purchasePriceDollars * (1 - downpaymentPercentage)
   const annualNominalRateDecimal = loanInterestRate != null
      ? loanInterestRate
      : DEFAULT_LOAN_INTEREST_RATE_DECIMAL
   const amortizationTermYears = loanTerm != null ? loanTerm : DEFAULT_LOAN_TERM_YEARS

   const monthlyMortgagePayment = getMonthlyMortgagePayment(
      loanPrincipalDollars,
      annualNominalRateDecimal,
      amortizationTermYears,
   )
   const monthlyCarryingCostsExcludingMortgage = getEstimatedMonthlyCarryingCostsExcludingMortgage(
      purchasePriceDollars,
      annualMunicipalTax,
      annualSchoolTax,
      annualInsurance,
      annualMaintenance,
   )

   return monthlyMortgagePayment + monthlyCarryingCostsExcludingMortgage
}

module.exports = {
   monthlyCostOfOwnership,
}
