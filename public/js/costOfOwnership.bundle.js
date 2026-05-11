(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Utility functions to set and restore button loading state 
 * for buttons that make API requests.
 */

/**
 * Set the button to a loading state by disabling it and displaying a spinner.
 * Also stores the original HTML of the button so it can be restored later.
 * 
 * NOTE: Never put user-controlled content into pendingText! Since pendingText 
 * gets injected via .html(), if it ever came from user input or a server response, 
 * it would be an XSS vector.
 * 
 * @param {jQuery} $button - The button to set to a loading state.
 * @param {string} pendingText - The text to display while the button is loading.
 */
const setButtonLoadingState = ($button, pendingText) => {
   $button.data('original-html', $button.html())
   $button.prop('disabled', true)
   $button.html(
      `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${
         pendingText
      }`
   )
}

/**
 * Restore the button to its original state by restoring the original HTML and enabling it.
 * Also removes the data-original-html attribute so it can't be used again.
 * 
 * @param {jQuery} $button - The button to restore to its original state.
 */
const restoreButtonFromLoadingState = ($button) => {
   const originalHtml = $button.data('original-html')
   if (!originalHtml) return  // guard against calling restore without a prior set
   $button.html(originalHtml)
   $button.prop('disabled', false)
   $button.removeData('original-html')  // clean up so stale data can't cause issues
}

module.exports = {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
}
},{}],2:[function(require,module,exports){
const ALLOWED_TYPES = new Set([
   `primary`,
   `secondary`,
   `success`,
   `warning`,
   `danger`,
   `info`,
   `light`,
   `dark`,
])

/**
 * DOM element for a message type. Legacy alias: `error` → `danger` (`#dangerContainer`).
 *
 * @param {string} type - The message type. Defaults to `info`.
 * @returns {JQuery} The container for the message type.
 */
const getContainerForMessageType = (type = 'info') => {
   // Legacy support
   if (type === 'error') type = 'danger'

   // Throw an error if the type is not allowed
   if(!ALLOWED_TYPES.has(type)) {
      throw new Error(`Invalid message type: ${type}`)
   }
   const $container = $(`#${type}Container`)
   // Throw an error if the container is not found
   if (!$container.length) {
      throw new Error(`Container for message type ${type} not found`)
   }
   return $container
}

/**
 * Display one or many dismissible Bootstrap alerts.
 *
 * Accepts either:
 * - one message object: { type?: string, message: string }
 * - or an array of message objects
 *
 * Supported `type`: primary, secondary, success, warning, danger, info, light, dark.
 * Unknown types fallback to `info`.
 *
 * @param {{type?: `primary`|`secondary`|`success`|`warning`|`danger`|`info`|`light`|`dark`, message: string} |
 * Array<{type?: `primary`|`secondary`|`success`|`warning`|`danger`|`info`|`light`|`dark`, message: string}>} messagesIn
 * @param {JQuery | null} [$optionalTarget] - If set, append all alerts here (e.g. `#invitationError`). Otherwise use `#messagesContainer` buckets (`#dangerContainer`, etc.).
 */
const displayMessages = (messagesIn, $optionalTarget = null) => {
   const messages = Array.isArray(messagesIn) ? messagesIn : [messagesIn]
   const list = messages.filter(Boolean)
   let appended = false
   let $lastTarget = null

   list.forEach((msg) => {
      const type = ALLOWED_TYPES.has(msg.type) ? msg.type : 'info'
      const message = Object.hasOwn(msg, 'message') ? msg.message : ''
      if (!message) return

      $lastTarget = $optionalTarget && $optionalTarget.length
         ? $optionalTarget
         : getContainerForMessageType(type)

      // Create the alert element
      const $alert = $('<div>')
         .addClass(`alert alert-${type} alert-dismissible fade show`)
         .attr('role', 'alert')
         
      // Add the message text without injecting
      $alert.text(message)

      // Create the close button
      const $btn = $('<button>')
         .addClass('btn-close')
         .attr({
            type: 'button',
            'data-bs-dismiss': 'alert',
            'aria-label': 'Close'
         })
      $alert.append($btn)

      // Append the alert to the target container
      $lastTarget.append($alert)

      appended = true
   })

   // Scroll into view if messages were appended
   if (appended) {
      $lastTarget[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
   }
}

/**
 * Clear all messages or one bucket.
 *
 * @param {`primary`|`secondary`|`success`|`warning`|`danger`|`info`|`light`|`dark`|`error` | null | undefined} [type] - Omit to clear every bucket under `#messagesContainer`. If `error`, it is treated as `danger` for legacy support.
 */
const clearMessages = (type) => {
   const $messagesContainer = $('#messagesContainer')
   if (!$messagesContainer.length) {
      throw new Error('Messages container not found')
   }

   if (type === undefined || type === null || type === '') {
      $messagesContainer.children().empty()
      return
   }

   if (type === 'error') type = 'danger' // Legacy support
   
   // Throw an error if the type is not allowed
   if (!ALLOWED_TYPES.has(type)) {
      throw new Error(`Invalid message type: ${type}`)
   }
   const $container = getContainerForMessageType(type)
   $container.empty()
}

module.exports = {
   displayMessages,
   clearMessages,
}

},{}],3:[function(require,module,exports){
const {
   displayMessages,
   clearMessages,
}                       = require(`./displayMessages`)

const GENERIC_ERROR_MESSAGE = `Une erreur inattendue s’est produite.\nEssayez de rafraîchir la page.`

/**
 * Normalizes errors to an array of objects with a `type` and `message` property.
 * If the error is undefined or null, returns an array with a single object with a `type` of `NOT-CUSTOM` and a `message` of the generic error message.
 * If the error is an array, returns the array.
 * If the error is an object, returns an array containing the object.
 * @param {unknown|unknown[]} errorsOrOne
 * @returns {Object[]}
 */
const normalizeErrors = (errorsOrOne) => {
   if (errorsOrOne === undefined || errorsOrOne === null) return [{
      type: `NOT-CUSTOM`,
      message: GENERIC_ERROR_MESSAGE,
   }]
   return Array.isArray(errorsOrOne) ? errorsOrOne : [errorsOrOne]
}

/**
 * Shows a single error via `alert()`.
 * Safe for end users: only surfaces `e.message` when `e.type === 'CUSTOM'` or `e.custom === true`;
 * otherwise shows a generic message (internal / unexpected errors).
 * @param {Object} e - Pass the caught value as-is (same rules as items in {@link displayErrors}).
 * @deprecated Use {@link displayErrors} instead.
 */
const errHandling = (e) => {
   // @TODO most likely error is that one is logged out -> if so I will not receive JSON, but a html response (redirect to login page)
   // if(e.type) if(e.type === `CUSTOM`) return errHandling(e.error)
   if(e.type === `CUSTOM` || e.custom) return alert(`${e.name}\n${e.message}`)
   alert(`Une erreur inattendue s’est produite.\nEssayez de rafraîchir la page.`)
   console.error(e)
}

/**
 * Maps API / catch values to `{ type: 'danger', message }` for {@link displayMessages}.
 * Shows each safe (`CUSTOM` / `custom`) message; if any item is not safe, appends one generic message.
 */
const mapErrorsToDangerMessages = (errors) => {
   const list = errors.filter(Boolean)
   const messages = []
   let hasNonCustom = false

   for (const error of list) {
      const safe = error && (error.type === `CUSTOM` || error.custom === true)
      if (safe) {
         messages.push({ type: `danger`, message: String(error.message ?? ``) })
      } else {
         hasNonCustom = true
      }
   }

   if (hasNonCustom) {
      messages.push({ type: `danger`, message: GENERIC_ERROR_MESSAGE })
   }

   return messages.filter((m) => m.message !== ``)
}

/**
 * Appends Bootstrap dismissible danger alerts. Do not unwrap or stringify errors yourself.
 *
 * **What to pass:** a **single** error or an **array** of whatever the API or `catch` gave you.
 *
 * **Per item:** if `error.type === 'CUSTOM'` or `error.custom === true`, `error.message` is shown to the user.
 * Otherwise the item contributes to a **single** generic French line (unless other items are custom).
 *
 * **Where it renders:**
 * - **`$container` omitted** — uses the shared layout: `#dangerContainer` inside `#messagesContainer` (include `views/partials/messages.ejs` on the page).
 * - **`$container` provided** — appends into that jQuery node (e.g. `#invitationError` in a modal).
 *
 * Rendering is delegated to {@link displayMessages} (text set via jQuery `.text()`, not HTML interpolation).
 *
 * @param {unknown|unknown[]} errorsOrError
 * @param {JQuery} [$container] - Optional target element for modal-only or inline slots.
 */
const displayErrors = (errorsOrError, $container) => {
   const messages = mapErrorsToDangerMessages(normalizeErrors(errorsOrError))
   if (messages.length === 0) return
   displayMessages(messages, $container)
}

/**
 * Clears error UI: either a specific jQuery container (modal slot) or the shared `#dangerContainer` bucket.
 *
 * @param {JQuery} [$container] - If passed, `$container.empty()`. Otherwise `clearMessages('danger')` (requires `#messagesContainer`).
 */
const clearErrorMessages = ($container) => {
   if ($container && $container.length) {
      $container.empty()
      return
   }
   clearMessages(`danger`)
}

module.exports = {
   errHandling,
   displayErrors,
   clearErrorMessages,
}

},{"./displayMessages":2}],4:[function(require,module,exports){
// Main Navbar management
// Currently only handles logout button in navbar
// Simply import into any page's JS file that uses the navbar
// Ensure the page has an id="messagesContainer" element for messages

const { DELETE }        = require('./rest')
const {
   displayErrors,
   clearErrorMessages,
}                       = require('./errorHandling')
const {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
}                       = require('./buttonLoadingState')

const $logoutBtn = $('#logoutBtn')

const LOGOUT_URL = '/users/logout'

$logoutBtn.on('click', async function () {
   if ($logoutBtn.prop('disabled')) return

   setButtonLoadingState($logoutBtn, `Signing out…`)

   try {
      await DELETE(LOGOUT_URL)
   } catch (err) {
      restoreButtonFromLoadingState($logoutBtn)
      clearErrorMessages()
      displayErrors(err)
   }
})
},{"./buttonLoadingState":1,"./errorHandling":3,"./rest":5}],5:[function(require,module,exports){
/**
 * Get the CSRF token from the meta tag.
 * @returns {string} The CSRF token.
 * @throws {Error} If the CSRF token is not found.
 */
const getCsrfToken = () => {
   const csrfToken = $('meta[name="csrf-token"]').attr('content')
   if(!csrfToken) throw {
      name: 'CSRF Token Not Found',
      message: 'The CSRF token was not found. Please refresh the page and try again.',
      type: 'CUSTOM',
   }
   return csrfToken
}

const setCsrfToken = (csrfToken) => {
   const $meta = $('meta[name="csrf-token"]')
   if(!$meta.length || !csrfToken) throw {
      name: 'CSRF Token Not Found',
      message: 'The CSRF token was not found. Please refresh the page and try again.',
      type: 'CUSTOM',
   }
   $meta.attr('content', csrfToken)
}

const isStaleCsrfResponse = (res) => {
   return !res.ok && (
      res.code === 'CSRF_INVALID' ||
      (res.error && res.error.code === 'CSRF_INVALID')
   )
}

const fetchFreshCsrfToken = async () => {
   const res = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
         'Content-Type': 'application/json',
      },
   }).then(r => r.json())

   if(!res.ok) throw res.error

   const csrfToken = res.data && res.data.csrfToken
   setCsrfToken(csrfToken)
   return csrfToken
}

const fetchJsonOrRefreshCsrf = async (url, options, retried=false) => {
   const res = await fetch(url, options).then(r => r.json())

   if(isStaleCsrfResponse(res) && !retried) {
      const csrfToken = await fetchFreshCsrfToken()
      if(options.headers && options.headers['X-CSRF-Token']) {
         options.headers['X-CSRF-Token'] = csrfToken
      }
      return fetchJsonOrRefreshCsrf(url, options, true)
   }

   if(!res.ok) throw res.error
   return res
}

/**
 * Make a GET request to the given URL.
 * @param {string} url 
 * @param {object} param1 
 * @param {boolean} param1.goToRedirect - Whether to redirect to the URL if the response has a redirect. Defaults to `true`.
 * @param {AbortSignal} param1.signal - Optional abort signal; create a controller in the caller and pass `controller.signal`.
 * @returns {Promise<object>} The response data.
 */
const GET = async (url, {goToRedirect=true, signal}={}) => {
   const options = {
      method: 'GET',
      credentials: 'include',
      headers: {
         'Content-Type': 'application/json'
      },
      signal,
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName('body')[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const POST = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `POST`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName('body')[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const PATCH = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `PATCH`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName(`body`)[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const DELETE = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `DELETE`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   return res.data
}

module.exports = {
   getCsrfToken,
   GET,
   POST,
   PATCH,
   DELETE,
}
},{}],6:[function(require,module,exports){
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

},{"../components/buttonLoadingState":1,"../components/errorHandling":3,"../components/mainNavBar":4,"../components/rest":5}]},{},[6]);
