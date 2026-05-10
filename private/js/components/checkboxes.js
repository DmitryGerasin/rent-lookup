/**
 * @param {JQuery} checkbox - JQuery checkbox input object
 * @param {boolean|null|undefined} setValue
 * - Value to assign to the checkbox.
 * - Accepts `null` for indeterminate and truthy or falsy for checked and unchecked.
 * - If `undefined` returns current value
 * @returns {boolean|null}
 * * If retrieving the value - the value of the checkbox; `null` means indeterminate.
 * * Else no return
 */
const boxVal = (checkbox, setValue=undefined) => {
   // Getting current value
   if(setValue === undefined) {
      if(checkbox[0].indeterminate) return null
      return checkbox.is(`:checked`)
   }

   // Setting new value
   if(setValue === null) return checkbox[0].indeterminate = true
   if(Boolean(setValue) === true) {
      checkbox[0].indeterminate = false
      checkbox.prop(`checked`, true)
      return
   }
   if(Boolean(setValue) === false) {
      checkbox[0].indeterminate = false
      checkbox.prop(`checked`, false)
      return
   }
}

/**
 * Initialize checkboxes that declare a data-initial-value.
 * Supported values: true, false, null.
 *
 * @param {boolean} force - Re-initialize even when data-initialized is true.
 */
const initializeCheckboxes = (force = false) => {
   const $checkboxes = $(`input[type="checkbox"][data-initial-value]`)

   const parseInitialValue = (raw) => {
      if(raw === true || raw === `true`) return true
      if(raw === false || raw === `false`) return false
      if(raw === null || raw === `null`) return null
      return undefined
   }

   $checkboxes.each(function() {
      const $checkbox = $(this)
      if(!force && $checkbox.attr(`data-initialized`) === `true`) return

      const parsed = parseInitialValue($checkbox.attr(`data-initial-value`))
      if(parsed === undefined) {
         console.error(`initializeCheckbox(): invalid data-initial-value`, this)
         return
      }

      boxVal($checkbox, parsed)
      $checkbox.attr(`data-initialized`, `true`)
   })
}

/**
 * Updates checkbox validity using the HTML5 Constraint Validation API.
 * Callers specify which of the 3 states (checked, unchecked, indeterminate) are valid.
 *
 * @param {string|JQuery[]} selector - CSS selector or jQuery collection of checkbox(es)
 * @param {object} options
 * @param {Array<'checked'|'unchecked'|'indeterminate'>} options.validStates
 *        Default: ['checked', 'unchecked'] (indeterminate invalid)
 * @param {string} options.message
 *        Custom validation message (default generic message).
 *        Is not actually visible to the user.
 * @returns {void}
 */
const updateCheckboxValidation = (
   selector,
   {
      validStates = ['checked', 'unchecked'],
      message = 'Veuillez sélectionner une valeur définie.',
   } = {},
) => {
   /** Map boxVal result to state string */
   const boxValToState = (val) => {
      if (val === null) return 'indeterminate'
      return val === true ? 'checked' : 'unchecked'
   }

   const $checkboxes = typeof selector === 'string' ? $(selector) : selector
   const validSet = new Set(validStates)

   $checkboxes.each(function() {
      const checkbox = this // raw DOM element (required for setCustomValidity)
      const $checkbox = $(checkbox)

      const val = boxVal($checkbox)
      const state = boxValToState(val)
      const isValid = validSet.has(state)

      if (isValid) {
         checkbox.setCustomValidity('') // clears error -> becomes valid
         $checkbox.removeAttr('aria-invalid')
      } else {
         checkbox.setCustomValidity(message) // non-empty string -> invalid
         $checkbox.attr('aria-invalid', 'true')
      }

      // Optional: if you want live visual updates without waiting for submit
      // checkbox.reportValidity() // to show the error message to the user
   })
}

module.exports = {
   boxVal,
   initializeCheckboxes,
   updateCheckboxValidation,
}
