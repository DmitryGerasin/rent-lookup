/**
 * System to keep these 2 in sync in terms of validation highlighting
 * @param {JQuery} dob - jQuery date of birth field
 * @param {JQuery} dobu - jQuery checkbox field for if date of birth is unknown
 */
const linkDobAndDobUnknown = (dob, dobu) => {
   dob.change(toggleDateValidation)
   dobu.change(toggleDateValidation)

   function toggleDateValidation() {
      if(dob.val() || dobu.is(`:checked`)) {
         dob.prop(`required`, false)
         dobu.prop(`required`, false)
      } else {
         dob.prop(`required`, true)
         dobu.prop(`required`, true)
      }
   }
}

module.exports = {
   linkDobAndDobUnknown,
}