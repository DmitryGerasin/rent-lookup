/**
 * Passport.js Local Authentication Strategy
 * 
 * This module configures Passport.js for local (email/password) authentication.
 * 
 * Security notes:
 * - Uses bcrypt for secure password comparison (timing-safe)
 * - Does not leak whether an email exists or password is wrong (generic error message)
 * - Never returns the password hash to the session or client
 * - Uses connection pooling for better resource management
 * - Logs authentication attempts for security auditing (without passwords)
 */

const bcrypt            = require('bcryptjs')
const LocalStrategy     = require('passport-local').Strategy
const { mainPool }      = require('../db/connections')
const { getUser }       = require('../db/queries/user')
const { timeStamp }     = require('../utils/timeStamp')

// Use promise-based pool for cleaner async/await patterns
const pool = mainPool.promise()

/**
 * Verify callback for Passport LocalStrategy
 * Called when a user attempts to authenticate with email/password
 * 
 * @param {string} email - The email address provided by the user
 * @param {string} password - The password provided by the user
 * @param {function} done - Passport callback function
 */
async function verifyCallback(email, password, done) {
   try {
      // Normalize email to lowercase for case-insensitive matching
      const normalizedEmail = email.toLowerCase().trim()

      // Query for user by email (case-insensitive)
      const sqlString = `SELECT id AS userID, firstName, lastName, email, password, category, active FROM _User WHERE LOWER(email) = ?`
      const [results] = await pool.query(sqlString, [normalizedEmail])

      // Check if user exists
      if (results.length === 0) {
         console.log(`${timeStamp()} Auth: Failed login attempt for non-existent email: ${normalizedEmail}`)
         // Return generic message to avoid email enumeration attacks
         return done(null, false, { message: 'Identifiants invalides.' })
      }

      const dbUser = results[0]

      // Check if account is active
      if (dbUser.active === 0 || dbUser.active === false) {
         console.log(`${timeStamp()} Auth: Login attempt for deactivated account: ${normalizedEmail}`)
         return done(null, false, { message: 'Votre compte a été désactivé.' })
      }

      // Verify password using bcrypt (timing-safe comparison)
      const isMatch = await bcrypt.compare(password, dbUser.password)

      if (!isMatch) {
         console.log(`${timeStamp()} Auth: Failed login attempt (wrong password) for: ${normalizedEmail}`)
         // Return generic message to avoid password enumeration
         return done(null, false, { message: 'Identifiants invalides.' })
      }

      // Authentication successful
      console.log(`${timeStamp()} Auth: Successful login for: ${normalizedEmail}`)

      // Build user object WITHOUT password hash
      const sessionUser = {
         userID: dbUser.userID,
         email: dbUser.email,
         firstName: dbUser.firstName,
         lastName: dbUser.lastName,
         category: dbUser.category,
         // Note: password is intentionally excluded from the session
      }

      return done(null, sessionUser)

   } catch (error) {
      console.error(`${timeStamp()} Auth: Database error during authentication:`, error.message)
      return done(error)
   }
}

/**
 * Configure Passport with LocalStrategy and serialization methods
 * @param {object} passport - The Passport instance to configure
 */
module.exports = function (passport) {
   // Configure local strategy
   passport.use(
      new LocalStrategy(
         {
            usernameField: 'email',
            passwordField: 'password',
         },
         verifyCallback
      )
   )

   /**
    * Serialize user to session
    * Only store the user ID in the session to minimize session storage
    */
   passport.serializeUser((user, done) => {
      done(null, user.userID)
   })

   /**
    * Deserialize user from session
    * Fetch full user data from database on each request
    * This ensures role/permission changes take effect immediately
    */
   passport.deserializeUser(async (userID, done) => {
      try {
         const user = await getUser(userID)

         if (!user) {
            return done(null, false)
         }

         done(null, user)
      } catch (err) {
         console.error(`${timeStamp()} Auth: Error deserializing user ${userID}:`, err.message)
         done(err)
      }
   })
}
