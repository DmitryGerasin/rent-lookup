/**
 * Tests for security/auth.js — redirect resolution and Passport guards.
 */

jest.mock(`../../config`, () => ({
   DEVELOPMENT: false,
   BYPASS_AUTH_IN_DEV: false,
   appHomePage: `/dashboard`,
   POST_LOGIN_REDIRECT_EXEMPTIONS: [
      /^\/api\//,
      /^\/search(?:\/|\?|$)/,
      /^\/users\/login(?:\/|\?|$)/,
      /^\/users\/logout(?:\/|\?|$)/,
      /^\/users\/register(?:\/|\?|$)/,
      /^\/js\//,
      /^\/css\//,
      /^\/img\//,
      /^\/favicon\.ico(?:\?|$)/,
      /^\/SDN_Logo\.ico(?:\?|$)/,
      /^\/legal\//,
   ],
   SAFE_RETURN_PATH_PREFIXES: [
      `/admin`,
      `/corp`,
      `/couple`,
      `/dashboard`,
      `/dragon`,
      `/file`,
      `/lawyer`,
      `/person`,
      `/profile`,
      `/qbo`,
      `/search`,
      `/dev`,
      `/time`,
      `/trust`,
      `/oauth`,
      `/users`,
   ],
}))

const {
   resolveRedirectToForUnauthenticatedRedirect,
   ensureAuthenticated,
   ensureNotAuthenticated,
} = require(`../auth`)

describe(`resolveRedirectToForUnauthenticatedRedirect`, () => {
   it(`keeps a valid saved path when the current URL is exempt (e.g. catch-all /users/login/)`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(
            `/users/login/`,
            `/file/2018-0082`,
         ),
      ).toBe(`/file/2018-0082`)
   })

   it(`keeps nested returnTo on person when hit with exempt /users/login/`, () => {
      const saved =
         `/person/1?returnTo=/person/752%3FreturnTo%3D%2Ffile%2F2018-0082`
      expect(
         resolveRedirectToForUnauthenticatedRedirect(`/users/login/`, saved),
      ).toBe(saved)
   })

   it(`keeps saved path when exempt static /js/*.map style URL (devtools source map)`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(
            `/js/vendors/bootstrap.bundle.min.js.map`,
            `/file/2018-0082`,
         ),
      ).toBe(`/file/2018-0082`)
   })

   it(`keeps saved path when exempt /legal/ static document`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(
            `/legal/Termes%20et%20conditions.pdf`,
            `/file/2018-0082`,
         ),
      ).toBe(`/file/2018-0082`)
   })

   it(`uses dashboard when exempt and there is no prior redirect`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(`/users/login`, undefined),
      ).toBe(`/dashboard`)
   })

   it(`uses dashboard when exempt and prior redirect is empty`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(`/api/foo`, `   `),
      ).toBe(`/dashboard`)
   })

   it(`ignores prior redirect when the current URL is not exempt`, () => {
      expect(
         resolveRedirectToForUnauthenticatedRedirect(
            `/person/99?returnTo=%2Ffile%2Fx`,
            `/dashboard`,
         ),
      ).toBe(`/person/99?returnTo=/file/x`)
   })
})

describe(`ensureAuthenticated`, () => {
   let mockNext
   let mockFlash
   let mockSave
   let mockRedirect
   let consoleLogSpy

   beforeEach(() => {
      jest.clearAllMocks()
      mockNext = jest.fn()
      mockFlash = jest.fn()
      mockSave = jest.fn((cb) => {
         cb()
      })
      mockRedirect = jest.fn()
      consoleLogSpy = jest.spyOn(console, `log`).mockImplementation(() => {})
   })

   afterEach(() => {
      consoleLogSpy.mockRestore()
   })

   it(`calls next when req.isAuthenticated() is true`, () => {
      const req = {
         isAuthenticated: () => true,
         originalUrl: `/person/1`,
         session: { redirectTo: undefined, save: mockSave },
         flash: mockFlash,
      }
      const res = {}

      ensureAuthenticated(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockFlash).not.toHaveBeenCalled()
      expect(mockSave).not.toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
   })

   it(`sets flash, redirectTo, saves session, and redirects to login when unauthenticated`, () => {
      const req = {
         isAuthenticated: () => false,
         originalUrl: `/person/42`,
         session: {
            redirectTo: undefined,
            save: mockSave,
         },
         flash: mockFlash,
      }
      const res = { redirect: mockRedirect }

      ensureAuthenticated(req, res, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(mockFlash).toHaveBeenCalledWith(
         `warning`,
         `Veuillez vous connecter pour accéder à cette ressource.`,
      )
      expect(req.session.redirectTo).toBe(`/person/42`)
      expect(mockSave).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith(`/users/login`)
   })

})

describe(`ensureNotAuthenticated`, () => {
   it(`calls next when not authenticated`, () => {
      const mockNext = jest.fn()
      const req = { isAuthenticated: () => false }
      const res = { redirect: jest.fn() }

      ensureNotAuthenticated(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(res.redirect).not.toHaveBeenCalled()
   })

   it(`redirects to app home when authenticated`, () => {
      const mockNext = jest.fn()
      const mockRedirect = jest.fn()
      const req = { isAuthenticated: () => true }
      const res = { redirect: mockRedirect }

      ensureNotAuthenticated(req, res, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith(`/dashboard`)
   })
})
