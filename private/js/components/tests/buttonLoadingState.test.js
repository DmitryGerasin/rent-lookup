const {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
} = require(`../buttonLoadingState`)

/**
 * Minimal jQuery-like object with only the methods used by buttonLoadingState.
 */
function createMockButton(initialHtml = `Envoyer`) {
   let innerHTML = initialHtml
   let disabled = false
   const store = {}

   return {
      html(value) {
         if (value === undefined) return innerHTML
         innerHTML = value
         return this
      },
      prop(name, value) {
         if (value === undefined) {
            if (name === `disabled`) return disabled
            return undefined
         }
         if (name === `disabled`) disabled = value
         return this
      },
      data(key, value) {
         if (value === undefined) return store[key]
         store[key] = value
         return this
      },
      removeData(key) {
         delete store[key]
         return this
      },
   }
}

describe(`buttonLoadingState`, () => {
   describe(`setButtonLoadingState`, () => {
      test(`disables the button and injects spinner + pending text`, () => {
         const $btn = createMockButton(`Envoyer`)
         setButtonLoadingState($btn, `Patientez...`)
         expect($btn.prop(`disabled`)).toBe(true)
         const html = $btn.html()
         expect(html).toContain(`spinner-border`)
         expect(html).toContain(`spinner-border-sm`)
         expect(html).toContain(`me-2`)
         expect(html).toContain(`Patientez...`)
      })

      test(`stores original HTML for restore`, () => {
         const $btn = createMockButton(`<span>Go</span>`)
         setButtonLoadingState($btn, `…`)
         expect($btn.data(`original-html`)).toBe(`<span>Go</span>`)
      })
   })

   describe(`restoreButtonFromLoadingState`, () => {
      test(`restores prior HTML, enables button, and clears stored data`, () => {
         const $btn = createMockButton(`Envoyer`)
         setButtonLoadingState($btn, `Veuillez patienter`)
         restoreButtonFromLoadingState($btn)
         expect($btn.prop(`disabled`)).toBe(false)
         expect($btn.html()).toBe(`Envoyer`)
         expect($btn.data(`original-html`)).toBeUndefined()
      })

      test(`second restore after first is a no-op (stale data cleared)`, () => {
         const $btn = createMockButton(`A`)
         setButtonLoadingState($btn, `x`)
         restoreButtonFromLoadingState($btn)
         $btn.html(`B`)
         restoreButtonFromLoadingState($btn)
         expect($btn.html()).toBe(`B`)
      })

      test(`does nothing when restore is called without a prior set`, () => {
         const $btn = createMockButton(`Other`)
         $btn.prop(`disabled`, true)
         restoreButtonFromLoadingState($btn)
         expect($btn.prop(`disabled`)).toBe(true)
         expect($btn.html()).toBe(`Other`)
      })
   })
})
