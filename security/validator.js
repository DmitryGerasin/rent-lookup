/**
 * Boolean predicate: trim input matches a strict positive decimal integer (`^[1-9]\d*$`).
 *
 * @param {unknown} raw
 * @returns {boolean}
 */
function isStrictPositiveInteger(raw) {
   if (raw == null) return false
   return /^[1-9]\d*$/.test(String(raw).trim())
}

/**
 * Checks if a value is a non-negative integer (0 included).
 *
 * @param {unknown} raw
 * @returns {boolean}
 */
function isNonNegativeInteger(raw) {
   if (raw == null) return false
   return /^(0|[1-9]\d*)$/.test(String(raw).trim())
}

/**
 * Parses a strictly positive integer from user input (`^[1-9]\d*$`, no leading zeros).
 *
 * @param {unknown} raw
 * @returns {number|null} Decimal digits without leading zeros, or `null` if absent / invalid / zero.
 */
function validatePositiveInteger(raw) {
   if (!isStrictPositiveInteger(raw)) return null
   return Number(String(raw).trim())
}

/**
 * Parses a non‑negative integer ( **`0`** allowed).
 *
 * @param {unknown} raw
 * @returns {number|null} Decimal digits without leading zeros, or `null` if absent / invalid / zero.
 */
function validateNonNegativeInteger(raw) {
   if (!isNonNegativeInteger(raw)) return null
   return Number(String(raw).trim())
}

/** Maximum value for MySQL **`INT UNSIGNED`** (`config/mysql/SDN.sql`). */
const UNSIGNED_INT32_MAX = 4294967295

/**
 * Validates any value stored as a MySQL **`INT UNSIGNED`** (except primary keys).
 *
 * Accepts a decimal number in the exact range `0` … {@link UNSIGNED_INT32_MAX}.
 * Use for attributes/columns that are unsigned integers but not used as PKs.
 *
 * @param {unknown} raw
 * @returns {number|null} - Validated unsigned 32-bit integer, or `null` if invalid/out of range.
 */
function validateUnsignedInt32(raw) {
   const n = validateNonNegativeInteger(raw)
   if (n === null) return null
   if (n > UNSIGNED_INT32_MAX) return null
   if (!Number.isInteger(n)) return null

   return n
}

/**
 * Validates a decimal number that fits MySQL **`INT UNSIGNED`** (`1` … {@link UNSIGNED_INT32_MAX}).
 *
 * **Purpose:** shared bound for `_Person.personID`, `_Lawyer.lawyerID`, `_Couple.coupleID`, etc.
 * Excludes 0, which is not a valid primary key.
 *
 * @param {unknown} raw
 * @returns {number|null} - Validated unsigned 32-bit integer, or `null` if invalid/out of range.
 */
function validateUnsignedInt32Pk(raw) {
   const int32 = validateUnsignedInt32(raw)
   if (int32 === 0) return null // 0 is not a valid primary key
   return int32
}

const CHECKED_STRING_TRUE = new Set([`1`, `true`, `yes`, `on`])
const CHECKED_STRING_FALSE = new Set([`0`, `false`, `no`, `off`, ``])

/**
 * Normalizes checkbox / tri-state input (checked, unchecked, indeterminate).
 *
 * Indeterminate matches **`null`** / **`undefined`**, and (when allowed) the trimmed strings
 * **`null`** and **`undefined`** (common when values round-trip through JSON or forms).
 *
 * @param {unknown} raw
 * @param {{ disallowIndeterminate?: boolean }} [options]
 * @returns {boolean|null|undefined}
 *    - Without **`disallowIndeterminate`**: **`true`**, **`false`**, or **`null`** (indeterminate).
 *      **`undefined`** means the value could not be interpreted.
 *    - With **`disallowIndeterminate: true`**: only **`true`** or **`false`**; **`undefined`** if the input
 *      is indeterminate, missing, or not a recognized checked/unchecked encoding.
 */
function validateChecked(raw, {disallowIndeterminate = false} = {}) {
   disallowIndeterminate = disallowIndeterminate === true

   if (raw === null || raw === undefined) {
      if (disallowIndeterminate) return undefined // i.e. failed to parse
      return null // i.e. indeterminate
   }

   if (typeof raw === `boolean`) {
      return raw // i.e. already normalized
   }

   if (typeof raw === `number`) {
      if (!Number.isFinite(raw)) return undefined // i.e. failed to parse
      if (raw === 1) return true
      if (raw === 0) return false
      return undefined // i.e. failed to parse
   }

   if (typeof raw === `string`) {
      const t = raw.trim()
      const lower = t.toLowerCase()
      if (lower === `null` || lower === `undefined`) {
         if (disallowIndeterminate) return undefined // i.e. failed to parse
         return null // i.e. indeterminate
      }
      if (CHECKED_STRING_TRUE.has(lower)) return true
      if (CHECKED_STRING_FALSE.has(lower)) return false
      return undefined // i.e. failed to parse
   }

   return undefined // i.e. failed to parse
}

module.exports = {
   UNSIGNED_INT32_MAX,
   validatePositiveInteger,
   validateNonNegativeInteger,
   validateUnsignedInt32,
   validateUnsignedInt32Pk,
   validateChecked,
}
