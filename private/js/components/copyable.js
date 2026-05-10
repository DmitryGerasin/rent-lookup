const floatingTextWidth = 62.44 // width of the 'copié' text, change together with _copyable.scss
const floatingTextHeight = 36 // height of the 'copié' text, change together with _copyable.scss
const verticalTravel = `1.5rem`


function getOffset(e) {
   return {
      left: e.clientX + window.scrollX - floatingTextWidth / 2,
      top: e.clientY + window.scrollY - floatingTextHeight,
   }
}
function removeFadeOut(span) {
   span.css({
      'opacity': `0`,
      'top': `calc(${span.css(`top`)} - ${verticalTravel})`,
   })

   setTimeout(function() {
      span.remove()
   }, 750) // 750ms needs to work together with transition duration
}

$(`.copyable`).on(`click`, function(e) {
   const { left, top } = getOffset(e)

   const span = $(`<span></span>`).addClass(`copied`).css({
      'top': `${top}px`,
      'left': `${left}px`,
   })
   
   $(`body`).append(span)
   
   /**
    * must use `$(this)` insead of `$(e.target)` because `$(e.target)` can be an element inside .copyable 
    * which does not have a `data-to-copy` attribute resulting in "undefined" being copied to clipboard
    */
   navigator.clipboard.writeText($(this).data(`to-copy`)) 
   
   function causeDelay() {
      /**
       * Note: Care should be taken when using a transition immediately after:
       *    - adding the element to the DOM using .appendChild()
       *    - removing an element's display: none; property.
       * This is treated as if the initial state had never occurred and the element was always 
       * in its final state. The easy way to overcome this limitation is to apply a 
       * window.setTimeout() of a handful of milliseconds before changing the CSS property 
       * you intend to transition to.
       * Source: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions 
      */
      setTimeout( 
         () => removeFadeOut(span), 
         5
      )
   }
   causeDelay()
   
})