/**
 * Tests for security/IPwhitelist.js
 */
describe(`security/IPwhitelist`, () => {
   const mockErrorCodes = jest.fn()
   let consoleErrorSpy

   const loadMiddleware = ({
      PRODUCTION = false,
      DEVELOPMENT = true,
      USE_IP_WHITELIST = true,
      whitelist = {},
   } = {}) => {
      jest.resetModules()
      mockErrorCodes.mockReset()

      jest.doMock(`../../services/errorCodes`, () => mockErrorCodes)
      jest.doMock(`../../config`, () => ({
         PRODUCTION,
         DEVELOPMENT,
         USE_IP_WHITELIST,
      }))
      jest.doMock(`../../config/ip.json`, () => whitelist, { virtual: false })

      return require(`../IPwhitelist`)
   }

   afterEach(() => {
      jest.dontMock(`../../services/errorCodes`)
      jest.dontMock(`../../config`)
      jest.dontMock(`../../config/ip.json`)
      if (consoleErrorSpy) {
         consoleErrorSpy.mockRestore()
      }
   })

   it(`blocks direct non-loopback access in production`, () => {
      consoleErrorSpy = jest.spyOn(console, `error`).mockImplementation(() => {})
      const { ensureIPWhitelisted } = loadMiddleware({
         PRODUCTION: true,
         DEVELOPMENT: false,
         whitelist: { "203.0.113.10": `Office` },
      })

      const req = {
         socket: { remoteAddress: `198.51.100.77` },
         ip: `203.0.113.10`,
         headers: { host: `dragon.local` },
      }
      const res = { locals: {} }
      const next = jest.fn()

      ensureIPWhitelisted(req, res, next)

      expect(mockErrorCodes).toHaveBeenCalledWith(
         res,
         403,
         `dragon.local is not available`,
      )
      expect(next).not.toHaveBeenCalled()
   })

   it(`allows loopback proxy access in production when forwarded IP is whitelisted`, () => {
      consoleErrorSpy = jest.spyOn(console, `error`).mockImplementation(() => {})
      const { ensureIPWhitelisted } = loadMiddleware({
         PRODUCTION: true,
         DEVELOPMENT: false,
         whitelist: { "203.0.113.10": `Office` },
      })

      const req = {
         socket: { remoteAddress: `::1` },
         ip: `::ffff:203.0.113.10`,
         headers: { host: `dragon.local` },
      }
      const res = { locals: {} }
      const next = jest.fn()

      ensureIPWhitelisted(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(mockErrorCodes).not.toHaveBeenCalled()
   })

   it(`rejects non-whitelisted client IP when whitelist enforcement is enabled`, () => {
      consoleErrorSpy = jest.spyOn(console, `error`).mockImplementation(() => {})
      const { ensureIPWhitelisted } = loadMiddleware({
         PRODUCTION: false,
         DEVELOPMENT: true,
         USE_IP_WHITELIST: true,
         whitelist: { "203.0.113.10": `Office` },
      })

      const req = {
         socket: { remoteAddress: `198.51.100.22` },
         ip: `198.51.100.22`,
         headers: { host: `dragon.local` },
      }
      const res = { locals: {} }
      const next = jest.fn()

      ensureIPWhitelisted(req, res, next)

      expect(mockErrorCodes).toHaveBeenCalledWith(
         res,
         403,
         `dragon.local is not available`,
      )
      expect(next).not.toHaveBeenCalled()
   })

   it(`allows request when whitelist check is disabled`, () => {
      consoleErrorSpy = jest.spyOn(console, `error`).mockImplementation(() => {})
      const { ensureIPWhitelisted } = loadMiddleware({
         PRODUCTION: false,
         DEVELOPMENT: true,
         USE_IP_WHITELIST: false,
         whitelist: {},
      })

      const req = {
         socket: { remoteAddress: `198.51.100.22` },
         ip: `198.51.100.22`,
         headers: { host: `dragon.local` },
      }
      const res = { locals: {} }
      const next = jest.fn()

      ensureIPWhitelisted(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(mockErrorCodes).not.toHaveBeenCalled()
   })
})
