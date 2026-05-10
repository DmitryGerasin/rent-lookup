// global.$                = require(`../external/jquery.min`)

// ENABLE MULTIPLE SELECT
// this needs to be called at the end of the js file
$(function() {
   $(`.multiple-select`).multipleSelect()
   $(`.multiple-select.ms-parent`).css(`width`, ``) // multipleSelect() tries to set a fixed width in px for some reason
})

// @todo on multipleSelect close: check for changes, ask to confirm if any changes, post (like in all transactions), then update

