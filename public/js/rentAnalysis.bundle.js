(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Rental registry analysis: filtering rules, registry search box size, and rent-analysis chart styling.
 *
 * This module uses only plain values and pure helpers (no `process.env`) so it can be
 * required from browserified client bundles as well as Node.
 */

/** Drop listings above this monthly rent when building tables and charts (outliers / bad data). */
const RENT_ANALYSIS_MAX_RENT_MONTHLY = 4250

/**
 * How many calendar years **before** the reference year are included in the window (inclusive).
 * Example: reference 2026 and value 4 → earliest year 2022.
 */
const RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE = 4

/**
 * How many calendar years **after** the reference year are included (inclusive).
 * `0` means data ends at the reference year (typically “current calendar year” on the server).
 */
const RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE = 0

/** Minimum edge length (meters) of the square bbox sent to the registry API (see `getHousings`). */
const REGISTRY_SEARCH_BOX_EDGE_METERS_MIN = 50

/** Maximum edge length (meters) of the square bbox sent to the registry API. */
const REGISTRY_SEARCH_BOX_EDGE_METERS_MAX = 2000

/** Default square edge length when the client omits or sends an invalid value. */
const REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT = 350

/** Slider / POST body step for search box edge length (meters). */
const REGISTRY_SEARCH_BOX_EDGE_METERS_STEP = 10

/**
 * Bedroom counts **greater than or equal to** this value use muted row styling on rent-analysis tables.
 */
const RENT_TABLE_MANY_BEDROOMS_THRESHOLD = 5

/**
 * Rent chart: listings are grouped into vertical bands of this width ($/month).
 * One bubble is drawn per (calendar year × bedroom colour × rent band).
 */
const RENT_CHART_DOLLAR_BUCKET_SIZE = 100

/** Minimum bubble radius (px) when a bucket has only one listing. */
const CHART_BUBBLE_RADIUS_MIN_PX = 4

/** Maximum bubble radius (px); caps very large buckets so the chart stays readable. */
const CHART_BUBBLE_RADIUS_MAX_PX = 34

/**
 * Bubble radius grows with √(listing count) × this factor (plus {@link CHART_BUBBLE_RADIUS_MIN_PX}).
 * Sqrt scaling keeps area growth perceptually closer to “more mass = more listings”.
 */
const CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX = 2.75

/** Horizontal separation of bedroom stacks on the scatter x-axis, in “year” axis units. */
const CHART_BEDROOM_STACK_SPREAD = 0.95

/**
 * Extra padding below the first and above the last calendar year on the chart x-axis
 * so edge stacks and tick labels are not clipped.
 */
const CHART_YEAR_AXIS_PAD = 0.85

/** Scatter point size (px). */
const CHART_POINT_RADIUS = 4

/** Scatter point size on hover (px). */
const CHART_POINT_HOVER_RADIUS = 6

/** Chart.js `layout.padding` around the plot area. */
const CHART_LAYOUT_PADDING = { left: 4, right: 12, top: 4, bottom: 6 }

/** Upper bound for x-axis ticks (years shown are derived from data window; this avoids Chart.js auto-skip hiding ticks). */
const CHART_X_AXIS_MAX_TICKS = 24

/** Rainbow order: red = 0 bedrooms … violet = 6; `SCATTER_ROOM_COLOR_7_PLUS` = 7+. */
const SCATTER_ROOM_COLORS = [
   `#d32f2f`,
   `#f57c00`,
   `#fbc02d`,
   `#388e3c`,
   `#1976d2`,
   `#3949ab`,
   `#8e24aa`,
]

const SCATTER_ROOM_COLOR_7_PLUS = `#4a148c`

const SCATTER_ROOM_LABELS = [
   `0 bedrooms`,
   `1 bedroom`,
   `2 bedrooms`,
   `3 bedrooms`,
   `4 bedrooms`,
   `5 bedrooms`,
   `6 bedrooms`,
   `7+ bedrooms`,
]

/**
 * Bedroom buckets for colour coding: indices 0–6 = exact bedroom counts, index 7 = 7+ merged.
 * Must match `SCATTER_ROOM_LABELS.length`.
 */
const CHART_BEDROOM_BUCKET_COUNT = SCATTER_ROOM_LABELS.length

/**
 * Inclusive calendar-year bounds used for filtering listings and for table columns.
 *
 * @param {number} [referenceCalendarYear] Usually `new Date().getFullYear()` on the server when processing a request.
 * @returns {{ yearMin: number, yearMax: number }}
 */
function getRentAnalysisYearWindow(referenceCalendarYear = new Date().getFullYear()) {
   return {
      yearMin:
         referenceCalendarYear - RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE,
      yearMax:
         referenceCalendarYear + RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE,
   }
}

/**
 * Clamp and quantize square bbox edge length from client input (meters).
 *
 * @param {unknown} rawValue From `req.body.boxEdgeMeters` or equivalent.
 * @returns {number}
 */
function clampRegistrySearchBoxEdgeMeters(rawValue) {
   let meters = Number(rawValue)
   if (!Number.isFinite(meters)) {
      meters = REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT
   }
   meters =
      Math.round(meters / REGISTRY_SEARCH_BOX_EDGE_METERS_STEP) *
      REGISTRY_SEARCH_BOX_EDGE_METERS_STEP
   return Math.min(
      REGISTRY_SEARCH_BOX_EDGE_METERS_MAX,
      Math.max(REGISTRY_SEARCH_BOX_EDGE_METERS_MIN, meters),
   )
}

/**
 * Map a bedroom count to a chart bucket index in `0 .. CHART_BEDROOM_BUCKET_COUNT - 1`.
 *
 * @param {number} closedBedroomCount From listing `number_of_closed_room`.
 */
function chartBedroomBucketIndex(closedBedroomCount) {
   return closedBedroomCount >= (CHART_BEDROOM_BUCKET_COUNT - 1)
      ? (CHART_BEDROOM_BUCKET_COUNT - 1)
      : closedBedroomCount
}

/**
 * X-axis offset for a bucket so stacks for the same calendar year do not overlap.
 *
 * @param {number} bucketIndex `0..7` from {@link chartBedroomBucketIndex}.
 */
function chartBedroomStackXOffset(bucketIndex) {
   const normalized = bucketIndex / (CHART_BEDROOM_BUCKET_COUNT - 1) - 0.5
   return normalized * CHART_BEDROOM_STACK_SPREAD
}

/**
 * Lower bound of the rent bucket containing `monthlyRent` (inclusive), in dollars.
 *
 * @param {number} monthlyRent
 */
function rentChartDollarBucketFloor(monthlyRent) {
   return (
      Math.floor(monthlyRent / RENT_CHART_DOLLAR_BUCKET_SIZE) *
      RENT_CHART_DOLLAR_BUCKET_SIZE
   )
}

/**
 * Vertical chart position: centre of the rent bucket band (so dots align to $50 steps).
 *
 * @param {number} monthlyRent
 */
function rentChartDollarBucketCenterY(monthlyRent) {
   return (
      rentChartDollarBucketFloor(monthlyRent) + RENT_CHART_DOLLAR_BUCKET_SIZE / 2
   )
}

/**
 * Bubble radius in pixels from the number of listings aggregated into one bucket.
 *
 * @param {number} listingCount Must be ≥ 1
 */
function chartBubbleRadiusPx(listingCount) {
   const scaled =
      CHART_BUBBLE_RADIUS_MIN_PX +
      Math.sqrt(listingCount) * CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX
   return Math.min(
      CHART_BUBBLE_RADIUS_MAX_PX,
      Math.max(CHART_BUBBLE_RADIUS_MIN_PX, scaled),
   )
}

module.exports = {
   RENT_ANALYSIS_MAX_RENT_MONTHLY,
   RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE,
   RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE,
   REGISTRY_SEARCH_BOX_EDGE_METERS_MIN,
   REGISTRY_SEARCH_BOX_EDGE_METERS_MAX,
   REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT,
   REGISTRY_SEARCH_BOX_EDGE_METERS_STEP,
   RENT_TABLE_MANY_BEDROOMS_THRESHOLD,
   RENT_CHART_DOLLAR_BUCKET_SIZE,
   CHART_BUBBLE_RADIUS_MIN_PX,
   CHART_BUBBLE_RADIUS_MAX_PX,
   CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX,
   CHART_BEDROOM_STACK_SPREAD,
   CHART_YEAR_AXIS_PAD,
   CHART_POINT_RADIUS,
   CHART_POINT_HOVER_RADIUS,
   CHART_LAYOUT_PADDING,
   CHART_X_AXIS_MAX_TICKS,
   CHART_BEDROOM_BUCKET_COUNT,
   SCATTER_ROOM_COLORS,
   SCATTER_ROOM_COLOR_7_PLUS,
   SCATTER_ROOM_LABELS,
   getRentAnalysisYearWindow,
   clampRegistrySearchBoxEdgeMeters,
   chartBedroomBucketIndex,
   chartBedroomStackXOffset,
   rentChartDollarBucketFloor,
   rentChartDollarBucketCenterY,
   chartBubbleRadiusPx,
}

},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"./displayMessages":3}],5:[function(require,module,exports){
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
},{"./buttonLoadingState":2,"./errorHandling":4,"./rest":6}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
/**
 * Rent analysis (`/rent-analysis`) — submit address → POST /api/rental-analysis → tables + rent bubble charts.
 * Analysis thresholds and chart styling come from `config/rentalAnalysis.js` (bundled).
 */

const rentalAnalysis = require(`../../../config/rentalAnalysis`)
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

const $submit = $(`#analyzeSubmit`)
const $street = $(`#street`)
const $city = $(`#city`)
const $postalCode = $(`#postalCode`)
const $registrySearchBoxEdge = $(`#registrySearchBoxEdge`)
const $registrySearchBoxEdgeValue = $(`#registrySearchBoxEdgeValue`)

function updateRegistrySearchBoxEdgeLabel() {
   const v = Number.parseInt(String($registrySearchBoxEdge.val()), 10)
   $registrySearchBoxEdgeValue.text(Number.isFinite(v) ? `${v} m` : ``)
}

$registrySearchBoxEdge.on(`input`, updateRegistrySearchBoxEdgeLabel)
updateRegistrySearchBoxEdgeLabel()
const $results = $(`#resultsSection`)
const $geocodeLine = $(`#geocodeLine`)
const $warningsBox = $(`#warningsBox`)
const $plexTableHead = $(`#plexTableHead`)
const $plexTableBody = $(`#plexTableBody`)
const $condoTableHead = $(`#condoTableHead`)
const $condoTableBody = $(`#condoTableBody`)
const $averagesTableHead = $(`#averagesTableHead`)
const $averagesTableBody = $(`#averagesTableBody`)
const $totalsLine = $(`#totalsLine`)
const $scatterSection = $(`#scatterChartSection`)
const $scatterFiltersLine = $(`#scatterFiltersLine`)
const $scatterEmptyPlex = $(`#scatterChartEmptyPlex`)
const $scatterEmptyCondo = $(`#scatterChartEmptyCondo`)
const $rentBedroomToggleWrapPlex = $(`#rentBedroomToggleWrapPlex`)
const $rentBedroomToggleWrapCondo = $(`#rentBedroomToggleWrapCondo`)

/** Active Chart.js instances keyed by segment (`plex` | `condo`). */
const scatterChartsBySegment = { plex: null, condo: null }

/**
 * Per-chart bedroom filter: `selected` is click-pinned (exclusive); `hover` previews while pointer is over a button.
 *
 * @type {Record<'plex'|'condo', { selected: number|null, hover: number|null }>}
 */
const bedroomFilterState = {
   plex: { selected: null, hover: null },
   condo: { selected: null, hover: null },
}

const formatMoney = (amount) =>
   new Intl.NumberFormat(`en-CA`, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
   }).format(amount)

/**
 * Aggregate raw listings into one bubble per (calendar year × bedroom colour × rent band).
 *
 * @param {Array<{ year: number, rent: number, bedrooms: number }>} scatterPoints
 */
function buildRentBubbleDatasets(scatterPoints) {
   const dollarBand = rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE
   /** One Map per bedroom colour: key `${year}|${rentFloor}` → `{ count, sumRent }`. */
   const seriesByBedroom = Array.from(
      { length: rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT },
      () => new Map(),
   )

   for (const point of scatterPoints) {
      const bedroomIdx = rentalAnalysis.chartBedroomBucketIndex(point.bedrooms)
      if (
         bedroomIdx < 0 ||
         bedroomIdx >= rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT
      ) {
         continue
      }
      const rentFloor = rentalAnalysis.rentChartDollarBucketFloor(point.rent)
      const key = `${point.year}|${rentFloor}`
      const map = seriesByBedroom[bedroomIdx]
      const agg = map.get(key) ?? { count: 0, sumRent: 0 }
      agg.count += 1
      agg.sumRent += point.rent
      map.set(key, agg)
   }

   return rentalAnalysis.SCATTER_ROOM_LABELS.map((label, bedroomIdx) => {
      const map = seriesByBedroom[bedroomIdx]
      const data = []
      for (const [key, agg] of map) {
         const [yearStr, floorStr] = key.split(`|`)
         const year = Number(yearStr)
         const rentBucketFloor = Number(floorStr)
         const yCenter = rentBucketFloor + dollarBand / 2
         data.push({
            x: year + rentalAnalysis.chartBedroomStackXOffset(bedroomIdx),
            y: yCenter,
            r: rentalAnalysis.chartBubbleRadiusPx(agg.count),
            year,
            rentBucketFloor,
            rentBucketCeilingExclusive: rentBucketFloor + dollarBand,
            count: agg.count,
            averageRent: agg.sumRent / agg.count,
         })
      }
      return {
         label,
         data,
         /** Used by bedroom toggle UI — maps to button index `0..7` (7 = 7+). */
         bedroomBucketIndex: bedroomIdx,
         backgroundColor:
            bedroomIdx === rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT - 1
               ? rentalAnalysis.SCATTER_ROOM_COLOR_7_PLUS
               : rentalAnalysis.SCATTER_ROOM_COLORS[bedroomIdx],
      }
   }).filter((dataset) => dataset.data.length > 0)
}

/**
 * @param {{ yearMin: number, yearMax: number }} yearBoundsInclusive Calendar years shown on the x-axis
 */
function scatterChartOptions(yearBoundsInclusive) {
   const { yearMin, yearMax } = yearBoundsInclusive
   const pad = rentalAnalysis.CHART_YEAR_AXIS_PAD

   return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
         padding: { ...rentalAnalysis.CHART_LAYOUT_PADDING },
      },
      scales: {
         x: {
            type: `linear`,
            min: yearMin - pad,
            max: yearMax + pad,
            title: { display: true, text: `Year` },
            ticks: {
               stepSize: 1,
               precision: 0,
               autoSkip: false,
               maxTicksLimit: rentalAnalysis.CHART_X_AXIS_MAX_TICKS,
               maxRotation: 0,
               callback(tickValue) {
                  const numeric =
                     typeof tickValue === `number` ? tickValue : Number(tickValue)
                  const rounded = Math.round(numeric)
                  if (!Number.isFinite(rounded)) return ``
                  if (Math.abs(numeric - rounded) > 1e-6) return ``
                  if (rounded < yearMin || rounded > yearMax) return ``
                  return String(rounded)
               },
            },
         },
         y: {
            title: { display: true, text: `Rent ($ / month)` },
            ticks: {
               callback: (value) => formatMoney(value),
            },
         },
      },
      plugins: {
         legend: {
            position: `bottom`,
            labels: { boxWidth: 12 },
            /** Avoid toggling datasets via legend — bedroom buttons own visibility. */
            onClick: null,
         },
         tooltip: {
            callbacks: {
               label: (context) => {
                  const raw = context.raw
                  if (!raw || typeof raw.x !== `number` || typeof raw.y !== `number`) {
                     return context.dataset.label || ``
                  }
                  const calendarYear =
                     typeof raw.year === `number` ? raw.year : Math.round(raw.x)
                  const rentHi =
                     typeof raw.rentBucketCeilingExclusive === `number`
                        ? raw.rentBucketCeilingExclusive - 1
                        : raw.y
                  const rentLo =
                     typeof raw.rentBucketFloor === `number`
                        ? raw.rentBucketFloor
                        : raw.y
                  const count = typeof raw.count === `number` ? raw.count : 1
                  const avgRent =
                     typeof raw.averageRent === `number`
                        ? raw.averageRent
                        : raw.y
                  const bucketPart = `$${formatMoney(rentLo)}–$${formatMoney(rentHi)}`
                  const listingsWord = count === 1 ? `listing` : `listings`
                  return `${context.dataset.label}: ${calendarYear}, ${bucketPart}, ${count} ${listingsWord}, avg $${formatMoney(avgRent)}`
               },
            },
         },
      },
   }
}

function resetBedroomFilterUi() {
   for (const seg of [`plex`, `condo`]) {
      bedroomFilterState[seg] = { selected: null, hover: null }
      const $wrap =
         seg === `plex` ? $rentBedroomToggleWrapPlex : $rentBedroomToggleWrapCondo
      $wrap
         .find(`.rent-bedroom-btn`)
         .removeClass(`active`)
         .prop(`disabled`, false)
   }
}

/**
 * @param {object|null} chart Chart.js instance
 * @param {JQuery} $wrap
 */
function syncBedroomToggleButtonsDisabled(chart, $wrap) {
   if (!chart) {
      $wrap.find(`.rent-bedroom-btn`).prop(`disabled`, true)
      return
   }
   const present = new Set(
      chart.data.datasets.map((ds) => ds.bedroomBucketIndex),
   )
   $wrap.find(`.rent-bedroom-btn`).each(function () {
      const b = Number($(this).data(`bedroom`))
      $(this).prop(`disabled`, !present.has(b))
   })
}

/**
 * @param {object|null} chart Chart.js instance
 * @param {'plex'|'condo'} segment
 */
function applyBedroomVisibility(chart, segment) {
   if (!chart) return
   const { selected, hover } = bedroomFilterState[segment]
   const effective = hover !== null ? hover : selected
   chart.data.datasets.forEach((_ds, datasetIndex) => {
      const ds = chart.data.datasets[datasetIndex]
      const visible =
         effective === null || ds.bedroomBucketIndex === effective
      chart.setDatasetVisibility(datasetIndex, visible)
   })
   chart.update()
}

/**
 * @param {'plex'|'condo'} segment
 */
function syncBedroomToggleButtonActive(segment) {
   const $wrap =
      segment === `plex` ? $rentBedroomToggleWrapPlex : $rentBedroomToggleWrapCondo
   const selected = bedroomFilterState[segment].selected
   $wrap.find(`.rent-bedroom-btn`).each(function () {
      const b = Number($(this).data(`bedroom`))
      $(this).toggleClass(`active`, selected === b)
   })
}

/**
 * @param {'plex'|'condo'} segment
 */
function applyBedroomFilter(segment) {
   applyBedroomVisibility(scatterChartsBySegment[segment], segment)
   syncBedroomToggleButtonActive(segment)
}

function destroyScatterCharts() {
   for (const segmentKey of Object.keys(scatterChartsBySegment)) {
      const chartInstance = scatterChartsBySegment[segmentKey]
      if (chartInstance) {
         chartInstance.destroy()
         scatterChartsBySegment[segmentKey] = null
      }
   }
   resetBedroomFilterUi()
}

$scatterSection.on(`click`, `.rent-bedroom-btn`, function (e) {
   const $btn = $(e.currentTarget)
   if ($btn.prop(`disabled`)) return
   const segment = $btn.closest(`[data-segment]`).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   const bedroom = Number($btn.data(`bedroom`))
   const state = bedroomFilterState[segment]
   if (state.selected === bedroom) {
      state.selected = null
   } else {
      state.selected = bedroom
   }
   applyBedroomFilter(segment)
})

$scatterSection.on(`mouseenter`, `.rent-bedroom-btn`, function (e) {
   const $btn = $(e.currentTarget)
   if ($btn.prop(`disabled`)) return
   const segment = $btn.closest(`[data-segment]`).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   bedroomFilterState[segment].hover = Number($btn.data(`bedroom`))
   applyBedroomVisibility(scatterChartsBySegment[segment], segment)
})

$scatterSection.on(`mouseleave`, `.rent-bedroom-toggle`, function (e) {
   const segment = $(e.currentTarget).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   bedroomFilterState[segment].hover = null
   applyBedroomFilter(segment)
})

/**
 * @param {string} canvasElementId
 * @param {Array<{ year: number, rent: number, bedrooms: number }>} scatterPoints
 * @param {{ yearMin: number, yearMax: number }} yearBoundsInclusive
 */
function createScatterChartOnCanvas(
   canvasElementId,
   scatterPoints,
   yearBoundsInclusive,
) {
   const ChartConstructor = typeof Chart !== `undefined` ? Chart : null
   const canvas = document.getElementById(canvasElementId)
   if (!canvas || !ChartConstructor || !scatterPoints?.length) return null

   const datasets = buildRentBubbleDatasets(scatterPoints)
   if (datasets.length === 0) return null

   return new ChartConstructor(canvas, {
      type: `bubble`,
      data: { datasets },
      options: scatterChartOptions(yearBoundsInclusive),
   })
}

/**
 * @param {object} summary API `data.summary`
 */
function renderRentScatterCharts(summary) {
   destroyScatterCharts()

   const ChartConstructor = typeof Chart !== `undefined` ? Chart : null
   if (!ChartConstructor) {
      $scatterSection.addClass(`d-none`)
      return
   }

   const condoPoints = summary?.scatterPointsCondo ?? []
   const plexPoints = summary?.scatterPointsPlexTownhouse ?? []
   const filters = summary?.filters

   const fallbackWindow = rentalAnalysis.getRentAnalysisYearWindow()
   const yearBoundsInclusive =
      filters?.yearMin != null && filters?.yearMax != null
         ? { yearMin: filters.yearMin, yearMax: filters.yearMax }
         : fallbackWindow

   if (filters) {
      $scatterFiltersLine.text(
         `Filters: rent ≤ $${formatMoney(filters.maxRentMonthly)} / month, years ${filters.yearMin}–${filters.yearMax}. Rent is grouped into $${rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE} buckets on the vertical axis; bubble area reflects how many listings fall in each bucket.`,
      )
   } else {
      $scatterFiltersLine.text(
         `Years ${yearBoundsInclusive.yearMin}–${yearBoundsInclusive.yearMax}; rent in $${rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE} bands; bubbles shifted slightly by bedroom count so stacks don’t overlap.`,
      )
   }

   $scatterSection.removeClass(`d-none`)

   scatterChartsBySegment.plex = createScatterChartOnCanvas(
      `rentScatterChartPlex`,
      plexPoints,
      yearBoundsInclusive,
   )
   scatterChartsBySegment.condo = createScatterChartOnCanvas(
      `rentScatterChartCondo`,
      condoPoints,
      yearBoundsInclusive,
   )

   if (scatterChartsBySegment.plex) $scatterEmptyPlex.addClass(`d-none`)
   else $scatterEmptyPlex.removeClass(`d-none`)

   if (scatterChartsBySegment.condo) $scatterEmptyCondo.addClass(`d-none`)
   else $scatterEmptyCondo.removeClass(`d-none`)

   syncBedroomToggleButtonsDisabled(
      scatterChartsBySegment.plex,
      $rentBedroomToggleWrapPlex,
   )
   syncBedroomToggleButtonsDisabled(
      scatterChartsBySegment.condo,
      $rentBedroomToggleWrapCondo,
   )
   applyBedroomVisibility(scatterChartsBySegment.plex, `plex`)
   applyBedroomVisibility(scatterChartsBySegment.condo, `condo`)
   syncBedroomToggleButtonActive(`plex`)
   syncBedroomToggleButtonActive(`condo`)

   $rentBedroomToggleWrapPlex.toggleClass(`d-none`, !scatterChartsBySegment.plex)
   $rentBedroomToggleWrapCondo.toggleClass(
      `d-none`,
      !scatterChartsBySegment.condo,
   )
}

/**
 * @param {{ averageRent: number, count: number }|null} cell
 */
function formatRentCellInnerHtml(cell) {
   if (cell == null) return `—`
   return `<span class="rent-cell"><span class="rent-cell__avg">$${formatMoney(cell.averageRent)}</span><span class="rent-cell__count">(${cell.count})</span></span>`
}

/**
 * @param {JQuery} $head
 * @param {JQuery} $body
 * @param {object|null|undefined} bedroomsYearTable `{ years, rows }`
 */
function renderRentYearTable($head, $body, bedroomsYearTable) {
   $head.empty()
   $body.empty()

   const calendarYears = bedroomsYearTable?.years ?? []
   const bodyRows = bedroomsYearTable?.rows ?? []

   if (calendarYears.length === 0) {
      $body.append(
         `<tr><td class="text-center text-muted">No year range available.</td></tr>`,
      )
      return
   }

   const yearColumnCount = calendarYears.length

   const headRow1 = `<tr>
      <th rowspan="2" scope="col" class="align-middle">Bedrooms</th>
      <th scope="colgroup" colspan="${yearColumnCount}" class="text-center">Average rent ($ / month)</th>
      <th rowspan="2" scope="col" class="align-middle">Listings</th>
   </tr>`
   const yearHeaderCells = calendarYears
      .map((calendarYear) => `<th scope="col">${calendarYear}</th>`)
      .join(``)
   const headRow2 = `<tr>${yearHeaderCells}</tr>`

   $head.append(headRow1)
   $head.append(headRow2)

   if (bodyRows.length === 0) {
      $body.append(
         `<tr><td colspan="${1 + yearColumnCount + 1}" class="text-center text-muted">No valid listings in the area for averages.</td></tr>`,
      )
      return
   }

   for (const row of bodyRows) {
      const rowClassAttribute =
         row.bedrooms >= rentalAnalysis.RENT_TABLE_MANY_BEDROOMS_THRESHOLD
            ? ` class="rent-table-row--five-plus-bedrooms"`
            : ``
      const dataCells = calendarYears
         .map((_calendarYear, yearColumnIndex) => {
            const innerHtml = formatRentCellInnerHtml(row.cells[yearColumnIndex])
            return `<td class="text-end">${innerHtml}</td>`
         })
         .join(``)
      $body.append(
         `<tr${rowClassAttribute}><th scope="row">${row.bedrooms}</th>${dataCells}<td class="text-end">${row.listings}</td></tr>`,
      )
   }
}

/**
 * @param {object} summary API `data.summary`
 */
function renderAllRentTables(summary) {
   renderRentYearTable($plexTableHead, $plexTableBody, summary?.bedroomsYearTablePlex)
   renderRentYearTable($condoTableHead, $condoTableBody, summary?.bedroomsYearTableCondo)
   renderRentYearTable(
      $averagesTableHead,
      $averagesTableBody,
      summary?.bedroomsYearTable,
   )
}

$submit.on(`click`, async () => {
   clearErrorMessages()

   const payload = {
      street: $street.val().trim(),
      city: $city.val().trim(),
      postalCode: $postalCode.val().trim(),
      boxEdgeMeters: rentalAnalysis.clampRegistrySearchBoxEdgeMeters(
         $registrySearchBoxEdge.val(),
      ),
   }

   setButtonLoadingState($submit, `Analyzing…`)

   try {
      const data = await POST(`/api/rental-analysis`, payload, { goToRedirect: false })

      const { geocode, summary } = data
      $geocodeLine.text(
         geocode?.formatted_address
            ? `Matched address: ${geocode.formatted_address}`
            : `Coordinates: ${geocode.lat?.toFixed?.(5)}, ${geocode.lng?.toFixed?.(5)}`,
      )

      const warnings = geocode?.warnings
      if (Array.isArray(warnings) && warnings.length > 0) {
         $warningsBox.removeClass(`d-none`).text(warnings.join(` `))
      } else {
         $warningsBox.addClass(`d-none`).text(``)
      }

      renderAllRentTables(summary)

      const retainedCount = summary?.totalListings ?? 0
      const rawInBboxCount = summary?.totalListingsInArea
      let totalsMessage = `Listings used (rent / year filters): ${retainedCount}.`
      if (typeof rawInBboxCount === `number` && rawInBboxCount !== retainedCount) {
         totalsMessage += ` Raw total in bbox: ${rawInBboxCount}.`
      }
      $totalsLine.text(totalsMessage)

      renderRentScatterCharts(summary)

      $results.removeClass(`d-none`)
   } catch (err) {
      displayErrors(err)
      destroyScatterCharts()
      $results.addClass(`d-none`)
   } finally {
      restoreButtonFromLoadingState($submit)
   }
})

},{"../../../config/rentalAnalysis":1,"../components/buttonLoadingState":2,"../components/errorHandling":4,"../components/mainNavBar":5,"../components/rest":6}]},{},[7]);
