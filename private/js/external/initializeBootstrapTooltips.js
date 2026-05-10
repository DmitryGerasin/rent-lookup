// Initialize all tooltips (Tooltips are opt-in for performance reasons)
// `.js-tooltip` lets us opt elements in without using `data-bs-toggle="tooltip"`
// (useful when the element already needs `data-bs-toggle="modal"`).
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"], .js-tooltip'))
const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
   return new bootstrap.Tooltip(tooltipTriggerEl)
})