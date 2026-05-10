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