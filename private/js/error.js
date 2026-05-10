$(function() {
   const $errorMessage = $(`#error-message`)

   const encodedErrorMessage = $errorMessage.data(`content`)
   const decodedErrorMessage = decodeURIComponent(encodedErrorMessage)

   $errorMessage.text(decodedErrorMessage)
})