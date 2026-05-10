/**
 * Login page - form submission via POST from rest.js
 * Captures g-recaptcha-response, displays errors, resets recaptcha on failure
 */

const { POST }          = require('../components/rest')
const {
   displayErrors,
   clearErrorMessages,
}                       = require('../components/errorHandling')
const {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
}                       = require('../components/buttonLoadingState')

const submitBtn = $('#loginSubmit')
const emailInput = $('#email')
const passwordInput = $('#password')

const resetCaptcha = () => {
   if (typeof grecaptcha !== 'undefined') grecaptcha.reset()
}
const getCaptchaResponse = () => {
   return typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : ''
}

submitBtn.on('click', async () => {

   const payload = {
      email: emailInput.val().trim(),
      password: passwordInput.val(),
      'g-recaptcha-response': getCaptchaResponse(),
   }

   setButtonLoadingState(submitBtn, `Connexion en cours...`)

   try {
      await POST('/users/login', payload)
   } catch (err) {
      resetCaptcha()
      clearErrorMessages()
      displayErrors(err)
      restoreButtonFromLoadingState(submitBtn)
   }
})
