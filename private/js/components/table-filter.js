const input = $(`#myInput`)
const toggleClosedFiles = $(`#toggleClosedFiles`)

input.keyup(function () {
   const showClosedFiles = toggleClosedFiles.is(`:checked`)

   const searchedText = $(this).val().toLowerCase()
   
   $(`#myTable tr`).not(`#table-header`).filter(function() {
      const rowText = $(this).text().toLowerCase()
      const isClosed = $(this).find('td.closed-at').text().trim() !== `` // Check if 'closedAt' column is not empty

      // Show rows that match the search and respect the checkbox state
      $(this).toggle(
         rowText.indexOf(searchedText) > -1 
         && (showClosedFiles || !isClosed)
      )
   })

})

// Trigger the keyup event when the checkbox is changed to re-evaluate the filter
toggleClosedFiles.change(function () {
   input.keyup()
})