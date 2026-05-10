/**
 * Tests for middleware/mountPublicStatic.js
 */

const request           = require(`supertest`)
const express           = require(`express`)

jest.mock(`../../config`, () => ({
   staticFilesMaxAge: 0,
}))

const mountPublicStatic = require(`../mountPublicStatic`)

describe(`mountPublicStatic`, () => {
   let app

   beforeEach(() => {
      app = express()
      app.use(mountPublicStatic)
      app.use((req, res) => {
         res.status(599).send(`fallback`)
      })
   })

   it(`returns 204 for GET paths ending in .map when no static file matches`, async () => {
      const suffix = `.map`
      const res = await request(app)
         .get(`/bundles/nonexistent-${Date.now()}${suffix}`)
         .expect(204)

      expect(res.text).toBe(``)
   })

   it(`does not swallow non-.map misses (falls through)`, async () => {
      await request(app)
         .get(`/bundles/nonexistent-${Date.now()}.xyz`)
         .expect(599)
   })

   it(`serves an existing file under public`, async () => {
      await request(app)
         .get(`/svg/copy.svg`)
         .expect(200)
   })
})
