const bcrypt = require(`bcryptjs`)
const fs = require(`fs`)
const path = require(`path`)
const pwdVal = require(`password-validator`)

/** Default: server-only path (never under `public/` — that is served by express.static). Override for tests via COMMON_PASSWORDS_PATH. */
const SHITTY_PASSWORDS_PATH = process.env.COMMON_PASSWORDS_PATH
   ? path.resolve(process.env.COMMON_PASSWORDS_PATH)
   : path.join(__dirname, `data/10MshittyPasswords.txt`)

function validatePasswordRequirements(password) {
   const errors = []
   if (!password) return errors

   const schema = new pwdVal()
   schema
      .is().min(10) // Minimum length 10
      .is().max(100) // Maximum length 100
      .has().uppercase() // Must have uppercase letters
      .has().lowercase() // Must have lowercase letters
      .has().digits() // Must have digits
      .has().symbols() // special symbols

   const validatorArray = schema.validate(password, { list: true })

   for (let i = 0; i < validatorArray.length; i++) {
      switch (validatorArray[i]) {
         case `min`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au moins 10 caractères.`,
            })
            break
         case `max`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au plus 100 caractères.`,
            })
            break
         case `uppercase`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au moins une lettre majuscule.`,
            })
            break
         case `lowercase`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au moins une lettre minuscule.`,
            })
            break
         case `digits`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au moins un chiffre.`,
            })
            break
         case `symbols`:
            errors.push({
               type: `CUSTOM`,
               name: `Erreur de validation`,
               message: `Le mot de passe doit contenir au moins un caractère spécial.`,
            })
            break
         default:
            break
      }
   }

   return errors
}

async function validatePasswordNotCommon(password) {
   const errors = []
   if (!password) return errors

   try {
      // Read each time (no long-lived buffer): checks are rare; pay disk/IO once per check and release memory after.
      const data = await fs.promises.readFile(SHITTY_PASSWORDS_PATH)
      // Preserve existing semantics: a substring match means "found". This is legacy, but we keep it to preserve rules.
      if (data.indexOf(password) >= 0) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Votre mot de passe est très commun et facilement devinable. Pour assurer la sécurité de votre compte, veuillez choisir un mot de passe plus robuste et unique.',
         })
      }
   } catch (err) {
      // Fail-closed would block registration if the dictionary isn't readable; legacy behavior logged and continued.
      console.error(`security/passwordPolicy.js -> validatePasswordNotCommon() failed to read dictionary`, err)
   }

   return errors
}

async function hashPassword(password) {
   return new Promise((resolve, reject) => {
      const saltRounds = 10
      bcrypt.hash(password, saltRounds, (err, hash) => {
         if (err) return reject(err)
         resolve(hash)
      })
   })
}

/**
 * Validate password (requirements + common password check)
 * Also checks that passwords match if password2 is provided
 * @param {string} password - The password to validate
 * @param {string} [password2] - Optional confirmation password
 * @returns {Promise<string[]>} Array of error messages (empty if valid)
 */
async function validatePassword(password, password2 = null) {
   const errors = []

   if (!password) {
      errors.push({
         type: `CUSTOM`,
         name: `Erreur de validation`,
         message: `Le mot de passe est requis.`,
      })
      return errors
   }

   if (password2 !== null && password !== password2) {
      errors.push({
         type: `CUSTOM`,
         name: `Erreur de validation`,
         message: `Les mots de passe ne correspondent pas.`,
      })
   }

   const requirementErrors = validatePasswordRequirements(password)
   errors.push(...requirementErrors)

   const commonErrors = await validatePasswordNotCommon(password)
   errors.push(...commonErrors)

   return errors
}

module.exports = {
   validatePassword,
   hashPassword,
}
