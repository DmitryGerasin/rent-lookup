const {
   getCsrfToken,
   GET,
   POST,
   PATCH,
   DELETE,
} = require(`../rest`)

describe(`rest.js`, () => {
   let appendChildMock
   let createdLink
   let metaStore

   beforeEach(() => {
      global.fetch = jest.fn()
      global.window = { location: { href: `/current` } }
      metaStore = { content: `csrf-token-value` }
      appendChildMock = jest.fn()
      createdLink = {
         setAttribute: jest.fn(),
         click: jest.fn(),
         remove: jest.fn(),
      }
      global.document = {
         createElement: jest.fn(() => createdLink),
         getElementsByTagName: jest.fn(() => [{ appendChild: appendChildMock }]),
      }
      global.$ = jest.fn(() => ({
         length: 1,
         attr: jest.fn((name, value) => {
            if(value === undefined) return metaStore[name]
            metaStore[name] = value
            return this
         }),
      }))
   })

   afterEach(() => {
      jest.clearAllMocks()
   })

   test(`getCsrfToken returns token from meta tag`, () => {
      expect(getCsrfToken()).toBe(`csrf-token-value`)
      expect(global.$).toHaveBeenCalledWith(`meta[name="csrf-token"]`)
   })

   test(`getCsrfToken throws CUSTOM error when token is missing`, () => {
      global.$ = jest.fn(() => ({
         attr: jest.fn(() => undefined),
      }))

      expect(() => getCsrfToken()).toThrow()
      try {
         getCsrfToken()
      } catch (err) {
         expect(err).toMatchObject({
            name: `CSRF Token Not Found`,
            type: `CUSTOM`,
         })
      }
   })

   test(`GET passes abort signal to fetch`, async () => {
      const signal = { aborted: false }
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, data: [`a`] }),
      })

      await GET(`/search/file`, { signal })

      expect(global.fetch).toHaveBeenCalledWith(
         `/search/file`,
         expect.objectContaining({ signal, method: `GET` })
      )
   })

   test(`GET rethrows AbortError`, async () => {
      global.fetch.mockRejectedValue({ name: `AbortError` })

      await expect(GET(`/search/file`)).rejects.toEqual({
         name: `AbortError`,
      })
   })

   test(`GET throws API error when ok is false`, async () => {
      const apiError = { name: `ValidationError`, message: `Invalid` }
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: false, error: apiError }),
      })

      await expect(GET(`/api`)).rejects.toEqual(apiError)
   })

   test(`GET redirects when response contains redirect and goToRedirect is true`, async () => {
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, redirect: `/next` }),
      })

      await GET(`/api`)
      expect(global.window.location.href).toBe(`/next`)
   })

   test(`GET returns data when redirect handling is disabled`, async () => {
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, redirect: `/next`, data: { a: 1 } }),
      })

      await expect(GET(`/api`, { goToRedirect: false })).resolves.toEqual({ a: 1 })
   })

   test(`GET handles download when goToRedirect is true`, async () => {
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, download: `/doc.pdf`, docName: `doc.pdf` }),
      })

      await GET(`/api`)
      expect(global.document.createElement).toHaveBeenCalledWith(`a`)
      expect(createdLink.setAttribute).toHaveBeenCalledWith(`href`, `/doc.pdf`)
      expect(createdLink.setAttribute).toHaveBeenCalledWith(`download`, `doc.pdf`)
      expect(appendChildMock).toHaveBeenCalledWith(createdLink)
      expect(createdLink.click).toHaveBeenCalled()
      expect(createdLink.remove).toHaveBeenCalled()
   })

   test(`POST sends JSON payload with csrf token`, async () => {
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, data: { ok: 1 } }),
      })

      await expect(POST(`/api`, { x: 1 })).resolves.toEqual({ ok: 1 })
      expect(global.fetch).toHaveBeenCalledWith(
         `/api`,
         expect.objectContaining({
            method: `POST`,
            credentials: `include`,
            body: JSON.stringify({ x: 1 }),
            headers: expect.objectContaining({
               'Content-Type': 'application/json',
               'X-CSRF-Token': `csrf-token-value`,
            }),
         })
      )
   })

   test(`POST refreshes stale csrf token once and retries original request`, async () => {
      global.fetch
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               code: `CSRF_INVALID`,
               error: { code: `CSRF_INVALID` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: { csrfToken: `fresh-token` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: { saved: true },
            }),
         })

      await expect(POST(`/api`, { x: 1 })).resolves.toEqual({ saved: true })

      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(global.fetch).toHaveBeenNthCalledWith(2, `/api/csrf-token`, expect.objectContaining({
         method: `GET`,
         credentials: `include`,
      }))
      expect(global.fetch.mock.calls[0][1].headers['X-CSRF-Token']).toBe(`fresh-token`)
      expect(global.fetch.mock.calls[2][1].headers['X-CSRF-Token']).toBe(`fresh-token`)
      expect(metaStore.content).toBe(`fresh-token`)
   })

   test(`POST only retries stale csrf token response once`, async () => {
      global.fetch
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: { code: `CSRF_INVALID` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: { csrfToken: `fresh-token` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: { code: `CSRF_INVALID`, name: `still bad` },
            }),
         })

      await expect(POST(`/api`, { x: 1 })).rejects.toEqual({ code: `CSRF_INVALID`, name: `still bad` })
      expect(global.fetch).toHaveBeenCalledTimes(3)
   })

   test(`POST throws refresh error when csrf refresh fails`, async () => {
      const refreshError = { name: `refresh failed` }
      global.fetch
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: { code: `CSRF_INVALID` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: refreshError,
            }),
         })

      await expect(POST(`/api`, { x: 1 })).rejects.toEqual(refreshError)
      expect(global.fetch).toHaveBeenCalledTimes(2)
   })

   test(`POST throws when csrf refresh response has no token`, async () => {
      global.fetch
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: { code: `CSRF_INVALID` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: {},
            }),
         })

      await expect(POST(`/api`, { x: 1 })).rejects.toMatchObject({
         name: `CSRF Token Not Found`,
         type: `CUSTOM`,
      })
   })

   test(`GET can retry stale csrf response without csrf request header`, async () => {
      global.fetch
         .mockResolvedValueOnce({
            json: async () => ({
               ok: false,
               error: { code: `CSRF_INVALID` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: { csrfToken: `fresh-token` },
            }),
         })
         .mockResolvedValueOnce({
            json: async () => ({
               ok: true,
               data: { ok: true },
            }),
         })

      await expect(GET(`/api`)).resolves.toEqual({ ok: true })
      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(global.fetch.mock.calls[2][1].headers).not.toHaveProperty(`X-CSRF-Token`)
   })

   test(`POST throws API error and supports redirect`, async () => {
      const apiError = { name: `bad`, type: `CUSTOM` }
      global.fetch
         .mockResolvedValueOnce({ json: async () => ({ ok: false, error: apiError }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, redirect: `/post-next` }) })

      await expect(POST(`/api`, { x: 1 })).rejects.toEqual(apiError)
      await POST(`/api`, { x: 1 })
      expect(global.window.location.href).toBe(`/post-next`)
   })

   test(`POST handles download when goToRedirect is true`, async () => {
      global.fetch.mockResolvedValue({
         json: async () => ({ ok: true, download: `/post.pdf`, docName: `post.pdf` }),
      })

      await POST(`/api`, { x: 1 })
      expect(createdLink.setAttribute).toHaveBeenCalledWith(`href`, `/post.pdf`)
      expect(createdLink.setAttribute).toHaveBeenCalledWith(`download`, `post.pdf`)
   })

   test(`PATCH sends JSON payload with csrf token and handles branches`, async () => {
      const apiError = { name: `patch-bad` }
      global.fetch
         .mockResolvedValueOnce({ json: async () => ({ ok: false, error: apiError }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, redirect: `/patch-next` }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, download: `/patch.pdf`, docName: `patch.pdf` }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, data: { ok: 2 } }) })

      await expect(PATCH(`/api`, { y: 2 })).rejects.toEqual(apiError)
      await PATCH(`/api`, { y: 2 })
      expect(global.window.location.href).toBe(`/patch-next`)
      await PATCH(`/api`, { y: 2 })
      expect(createdLink.setAttribute).toHaveBeenCalledWith(`href`, `/patch.pdf`)
      await expect(PATCH(`/api`, { y: 2 }, { goToRedirect: false })).resolves.toEqual({ ok: 2 })
      expect(global.fetch).toHaveBeenCalledWith(
         `/api`,
         expect.objectContaining({
            method: `PATCH`,
            body: JSON.stringify({ y: 2 }),
            headers: expect.objectContaining({ 'X-CSRF-Token': `csrf-token-value` }),
         })
      )
   })

   test(`DELETE sends JSON payload with csrf token and handles branches`, async () => {
      const apiError = { name: `delete-bad` }
      global.fetch
         .mockResolvedValueOnce({ json: async () => ({ ok: false, error: apiError }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, redirect: `/delete-next` }) })
         .mockResolvedValueOnce({ json: async () => ({ ok: true, data: { removed: true } }) })

      await expect(DELETE(`/api`, { id: 5 })).rejects.toEqual(apiError)
      await DELETE(`/api`, { id: 5 })
      expect(global.window.location.href).toBe(`/delete-next`)
      await expect(DELETE(`/api`, { id: 5 }, { goToRedirect: false })).resolves.toEqual({ removed: true })
      expect(global.fetch).toHaveBeenCalledWith(
         `/api`,
         expect.objectContaining({
            method: `DELETE`,
            body: JSON.stringify({ id: 5 }),
            headers: expect.objectContaining({ 'X-CSRF-Token': `csrf-token-value` }),
         })
      )
   })
})
