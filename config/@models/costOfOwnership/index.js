/**
 * Defaults and estimate fractions for `models/costOfOwnership` (monthly carrying-cost estimates).
 * Plain numeric literals only (safe to require from Node or bundled client code).
 */

/**
 * Default annual nominal interest rate on the mortgage, expressed as a decimal
 * (for example 4.75% per year is written as 0.0475, not 4.75).
 */
const DEFAULT_LOAN_INTEREST_RATE_DECIMAL = 0.0475

/**
 * Default amortization length: how many calendar years until the loan would be fully paid
 * at the scheduled payment amount (standard fixed-payment mortgage assumption).
 */
const DEFAULT_LOAN_TERM_YEARS = 30

/**
 * When the caller does not supply an annual municipal (property) tax amount, the model approximates it
 * as this fraction of the purchase price for a rough total carrying-cost estimate.
 */
const MUNICIPAL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE = 0.009

/**
 * When annual school tax is omitted, the model approximates it as this fraction of the purchase price.
 */
const SCHOOL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE = 0.001

/**
 * When annual home insurance is omitted, the model approximates it as this fraction of the purchase price.
 */
const INSURANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE = 0.0025

/**
 * When annual maintenance / upkeep is omitted, the model approximates it as this fraction of the purchase price.
 */
const MAINTENANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE = 0.01

module.exports = {
   DEFAULT_LOAN_INTEREST_RATE_DECIMAL,
   DEFAULT_LOAN_TERM_YEARS,
   MUNICIPAL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   SCHOOL_TAX_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   INSURANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
   MAINTENANCE_ESTIMATE_FRACTION_OF_PURCHASE_PRICE,
}
