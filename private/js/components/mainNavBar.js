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