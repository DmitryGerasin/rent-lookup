const fs = require(`fs`)
const path = require(`path`)
const bcrypt = require(`bcryptjs`)

const fixturePath = path.join(__dirname, `fixtures/tiny-common-passwords.txt`)

describe(`security/passwordPolicy`, () => {
   describe(`with COMMON_PASSWORDS_PATH (test dictionary)`, () => {
      let validatePassword
      let hashPassword
      let readFileSpy

      beforeEach(() => {
         jest.resetModules()
         process.env.COMMON_PASSWORDS_PATH = fixturePath
         readFileSpy = jest.spyOn(fs.promises, `readFile`)
         ;({ validatePassword, hashPassword } = require(`../../passwordPolicy`))
      })

      afterEach(() => {
         readFileSpy.mockRestore()
         delete process.env.COMMON_PASSWORDS_PATH
      })

      it(`reads the blocklist from disk on each validation that runs the common-password check`, async () => {
         const strong1 = `Zx9!KpLmNq2Wv`
         const strong2 = `Ab3$Xy7ZqRt4Mn`
         const errors1 = await validatePassword(strong1)
         const errors2 = await validatePassword(strong2)
         expect(errors1).toEqual([])
         expect(errors2).toEqual([])
         expect(readFileSpy).toHaveBeenCalledTimes(2)
         expect(readFileSpy).toHaveBeenCalledWith(fixturePath)
      })

      it(`flags a password that appears in the blocklist (substring match)`, async () => {
         const blocked = `BlocklistPwd1!`
         const errors = await validatePassword(blocked)
         const common = errors.find((e) => e.message && e.message.includes(`très commun`))
         expect(common).toBeDefined()
      })

      it(`returns requirement errors without needing a match in the blocklist first`, async () => {
         const errors = await validatePassword(`short`)
         expect(errors.length).toBeGreaterThan(0)
         expect(errors.some((e) => e.message && e.message.includes(`10`))).toBe(true)
      })

      it(`reports mismatch when confirmation differs`, async () => {
         const errors = await validatePassword(`Zx9!KpLmNq2Wv`, `Other1!Pass`)
         expect(errors.some((e) => e.message && e.message.includes(`correspondent pas`))).toBe(true)
      })
   })

   describe(`hashPassword`, () => {
      beforeEach(() => {
         jest.resetModules()
         process.env.COMMON_PASSWORDS_PATH = fixturePath
      })

      afterEach(() => {
         delete process.env.COMMON_PASSWORDS_PATH
      })

      it(`produces a bcrypt hash that verifies`, async () => {
         const { hashPassword } = require(`../../passwordPolicy`)
         const plain = `Zx9!KpLmNq2Wv`
         const hash = await hashPassword(plain)
         expect(await bcrypt.compare(plain, hash)).toBe(true)
      })
   })
})
