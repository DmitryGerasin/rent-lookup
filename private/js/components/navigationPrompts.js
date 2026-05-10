/** Prevents leaving or refreshing the page if true */
function navigationPrompt(warn=false) {
   if(warn) {
      // Enable navigation-away prompt
      window.onbeforeunload = function() { return true }
   } else {
      // Remove navigation-away prompt
      window.onbeforeunload = null
   }
}
/** @param {*} trackingChangesIn - Object which keeps track of all value changes */
 function updateNavPrompt(trackingChangesIn) {
   if(Object.keys(trackingChangesIn).length === 0) return navigationPrompt(false)
   return navigationPrompt(true)
}

module.exports = {
   navigationPrompt,
   updateNavPrompt,
}