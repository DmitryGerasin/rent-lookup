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
