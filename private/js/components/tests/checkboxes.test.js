/**
 * @jest-environment jsdom
 */

const $ = require(`jquery`)
global.$ = global.jQuery = $

const { boxVal, initializeCheckboxes, updateCheckboxValidation } = require(`../checkboxes`)

describe(`checkboxes`, () => {
   describe(`boxVal`, () => {
      test(`returns false when unchecked and not indeterminate`, () => {
         document.body.innerHTML = `<input type="checkbox" id="c" />`
         const $cb = $(`#c`)
         expect(boxVal($cb)).toBe(false)
      })

      test(`returns true when checked`, () => {
         document.body.innerHTML = `<input type="checkbox" id="c" checked />`
         const $cb = $(`#c`)
         expect(boxVal($cb)).toBe(true)
      })

      test(`returns null when indeterminate`, () => {
         document.body.innerHTML = `<input type="checkbox" id="c" />`
         const $cb = $(`#c`)
         $cb[0].indeterminate = true
         expect(boxVal($cb)).toBe(null)
      })

      test(`sets checked, unchecked, and indeterminate`, () => {
         document.body.innerHTML = `<input type="checkbox" id="c" />`
         const $cb = $(`#c`)
         boxVal($cb, true)
         expect($cb.is(`:checked`)).toBe(true)
         expect($cb[0].indeterminate).toBe(false)
         boxVal($cb, false)
         expect($cb.is(`:checked`)).toBe(false)
         boxVal($cb, null)
         expect($cb[0].indeterminate).toBe(true)
      })
   })

   describe(`initializeCheckboxes`, () => {
      beforeEach(() => {
         document.body.innerHTML = ``
         jest.spyOn(console, `error`).mockImplementation(() => {})
      })

      afterEach(() => {
         jest.restoreAllMocks()
      })

      test(`applies data-initial-value and sets data-initialized`, () => {
         document.body.innerHTML = `
            <input type="checkbox" id="a" data-initial-value="true" />
            <input type="checkbox" id="b" data-initial-value="false" />
            <input type="checkbox" id="c" data-initial-value="null" />
         `
         initializeCheckboxes()
         expect(boxVal($(`#a`))).toBe(true)
         expect(boxVal($(`#b`))).toBe(false)
         expect(boxVal($(`#c`))).toBe(null)
         expect($(`#a`).attr(`data-initialized`)).toBe(`true`)
      })

      test(`skips when already initialized unless force`, () => {
         document.body.innerHTML =
            `<input type="checkbox" id="a" data-initial-value="true" data-initialized="true" />`
         boxVal($(`#a`), false)
         initializeCheckboxes()
         expect(boxVal($(`#a`))).toBe(false)
         initializeCheckboxes(true)
         expect(boxVal($(`#a`))).toBe(true)
      })

      test(`logs error for invalid data-initial-value`, () => {
         document.body.innerHTML =
            `<input type="checkbox" id="bad" data-initial-value="maybe" />`
         initializeCheckboxes()
         expect(console.error).toHaveBeenCalled()
      })
   })

   test(`module exports checkbox helpers`, () => {
      const mod = require(`../checkboxes`)
      expect(typeof mod.boxVal).toBe(`function`)
      expect(typeof mod.initializeCheckboxes).toBe(`function`)
      expect(typeof mod.updateCheckboxValidation).toBe(`function`)
   })

   describe(`updateCheckboxValidation`, () => {
      test(`marks invalid state`, () => {
         document.body.innerHTML = `<input type="checkbox" id="v" />`
         const $cb = $(`#v`)
         boxVal($cb, null)
         updateCheckboxValidation(`#v`, { validStates: [`checked`, `unchecked`] })
         expect($cb.attr(`aria-invalid`)).toBe(`true`)
      })

      test(`clears invalid state when checkbox becomes valid`, () => {
         document.body.innerHTML = `<input type="checkbox" id="v" />`
         const $cb = $(`#v`)

         boxVal($cb, null)
         updateCheckboxValidation(`#v`, { validStates: [`checked`, `unchecked`] })
         expect($cb.attr(`aria-invalid`)).toBe(`true`)

         boxVal($cb, true)
         updateCheckboxValidation(`#v`, { validStates: [`checked`, `unchecked`] })
         expect($cb.attr(`aria-invalid`)).toBeUndefined()
         expect($cb[0].validationMessage).toBe(``)
      })

      test(`supports jQuery collection selector input`, () => {
         document.body.innerHTML = `<input type="checkbox" id="v" />`
         const $cb = $(`#v`)
         boxVal($cb, true)
         updateCheckboxValidation($cb, { validStates: [`checked`] })
         expect($cb.attr(`aria-invalid`)).toBeUndefined()
      })
   })
})
