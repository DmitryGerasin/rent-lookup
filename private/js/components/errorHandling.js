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
