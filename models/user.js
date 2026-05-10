/**
 * User Model
 * 
 * Handles user operations for the application.
 * All methods are static - no instance state needed.
 * 
 * Security:
 * - Password validation and hashing handled internally via security/passwordPolicy.js
 * - Never returns password hash or QBO tokens in search results
 * - Email is normalized to lowercase for case-insensitive handling
 */

const {
   searchUser,
   getUser,
   getUserByEmployeeId,
   saveUser,
   updateUser,
   userExistsByEmail,
   userExistsByName,
}                       = require('../db/queries/user')
const {
   validatePassword,
   hashPassword,
}                       = require('../security/passwordPolicy')
const { VALID_ROLES }    = require('../config')
const isValidEmail      = require('../utils/isValidEmail')

/**
 * User class for managing application users
 */
class User {
   /**
    * Search for users
    * @param {object} options
    * @param {object} [options.searchParams] - Key-value pairs to search for
    * @param {boolean} [options.showAll=false] - If true, returns all users. Default is false.
    * @returns {Promise<Array>} Array of user objects (excludes sensitive fields)
    */
   static async search({ searchParams = null, showAll = false } = {}) {
      return await searchUser(searchParams, showAll)
   }

   /**
    * Get all users
    * @returns {Promise<Array>} Array of user objects
    */
   static async getAll() {
      return await searchUser(null, true)
   }

   /**
    * Get all active users
    * @returns {Promise<Array>} Array of active user objects
    */
   static async getActive() {
      return await searchUser({ active: 1 }, false)
   }

   /**
    * Get a user by ID (returns null if not found)
    * @param {number} id - The user ID
    * @returns {Promise<object|null>} User object or null
    */
   static async getById(id) {
      return await getUser(id)
   }

   /**
    * Get a user by ID (throws if not found)
    * @param {number} id - The user ID
    * @returns {Promise<object>} User object
    * @throws {object} Custom error if user not found
    */
   static async getByIdOrFail(id) {
      const user = await getUser(id)
      if (!user) {
         throw {
            type: 'CUSTOM',
            name: 'Utilisateur introuvable',
            message: `L’utilisateur avec l’identifiant ${id} n’existe pas.`,
         }
      }
      return user
   }

   /**
    * Get a user by their linked employee ID (returns null if not found)
    * @param {number} employeeId - The employee ID
    * @returns {Promise<object|null>} User object or null
    */
   static async getByEmployeeId(employeeId) {
      return await getUserByEmployeeId(employeeId)
   }

   /**
    * Validate user data for creation, includes password validation (requirements + common password check + confirmation match).
    * @param {object} data - User data to validate
    * @param {string} data.firstName - First name
    * @param {string} data.lastName - Last name
    * @param {string} data.email - Email address
    * @param {string} data.password - The raw password to validate
    * @param {string} data.password2 - Optional password confirmation
    * @param {string} data.category - User role/category
    * @param {object} [options]
    * @param {boolean} [options.publicInviteRegistration] - If true, skip email/name uniqueness checks
    *    (invitation registration). Conflicts are enforced in `Invitation.registerFromInvitation` with a generic client message.
    * @returns {Promise<string[]>} Array of error messages (empty if valid)
    */
   static async validateForSave({
      firstName,
      lastName,
      email,
      password,
      password2,
      category,
   }, options = {}) {
      const { publicInviteRegistration = false } = options
      const errors = []

      if (!firstName || !firstName.trim()) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Le prénom est requis.',
         })
      }

      if (!lastName || !lastName.trim()) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Le nom de famille est requis.',
         })
      }

      if (!email || !email.trim()) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'L’adresse courriel est requise.',
         })
      } else if (!isValidEmail(email)) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'L’adresse courriel n’est pas valide.',
         })
      } else if (!publicInviteRegistration) {
         const emailExists = await userExistsByEmail(email)
         if (emailExists) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Cette adresse courriel est déjà utilisée.',
            })
         }
      }

      const passwordErrors = await validatePassword(password, password2)
      errors.push(...passwordErrors)

      if (category && !VALID_ROLES.includes(category)) {
         errors.push({
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: `Le rôle doit être l’un des suivants: ${VALID_ROLES.join(', ')}.`,
         })
      }

      if (!publicInviteRegistration && firstName && lastName) {
         const nameExists = await userExistsByName(firstName.trim(), lastName.trim())
         if (nameExists) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Un utilisateur avec ce prénom et nom existe déjà.',
            })
         }
      }

      return errors
   }

   /**
    * Validate user data for update
    * @param {number} id - The user ID being updated
    * @param {object} updates - Fields to update
    * @returns {Promise<string[]>} Array of error messages (empty if valid)
    */
   static async validateForUpdate(id, updates) {
      const errors = []

      if (updates.firstName !== undefined) {
         if (!updates.firstName || !updates.firstName.trim()) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Le prénom est requis.',
            })
         }
      }

      if (updates.lastName !== undefined) {
         if (!updates.lastName || !updates.lastName.trim()) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Le nom de famille est requis.',
            })
         }
      }

      if (updates.email !== undefined) {
         if (!updates.email || !updates.email.trim()) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'L’adresse courriel est requise.',
            })
         } else if (!isValidEmail(updates.email)) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'L’adresse courriel n’est pas valide.',
            })
         } else {
            const existing = await User.getById(id)
            if (existing && existing.email.toLowerCase() !== updates.email.toLowerCase()) {
               const emailExists = await userExistsByEmail(updates.email)
               if (emailExists) {
                  errors.push({
                     type: 'CUSTOM',
                     name: 'Erreur de validation',
                     message: 'Cette adresse courriel est déjà utilisée.',
                  })
               }
            }
         }
      }

      if (updates.category !== undefined) {
         if (!VALID_ROLES.includes(updates.category)) {
            errors.push({
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: `Le rôle doit être l’un des suivants: ${VALID_ROLES.join(', ')}.`,
            })
         }
      }

      return errors
   }

   /**
    * Create a new user
    * Accepts raw password, validates it, and hashes it before saving.
    * 
    * @param {object} data - User data
    * @param {string} data.firstName - First name
    * @param {string} data.lastName - Last name
    * @param {string} data.email - Email address
    * @param {string} data.password - Raw password (will be validated and hashed)
    * @param {string} [data.password2] - Optional password confirmation
    * @param {string} [data.category='unassigned'] - User role/category
    * @param {boolean} [data.active=true] - Whether user is active
    * @returns {Promise<number>} Inserted user ID
    * @throws {object} Custom error if validation fails or duplicate entry
    */
   static async save(data) {
      const errors = []

      // Validate user data
      const userErrors = await User.validateForSave(data)
      errors.push(...userErrors)

      if (errors.length > 0) {
         throw {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: errors.map(error => error.message).join(' '),
            errors,
         }
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password)

      const insertData = {
         firstName: data.firstName.trim(),
         lastName: data.lastName.trim(),
         email: data.email.toLowerCase().trim(),
         password: hashedPassword,
         category: data.category || 'unassigned',
         active: data.active !== undefined ? Boolean(data.active) : true,
      }

      try {
         return await saveUser(insertData)
      } catch (err) {
         if (err.code === 'ER_DUP_ENTRY') {
            if (err.message?.includes('email')) {
               throw {
                  type: 'CUSTOM',
                  name: 'Courriel déjà utilisé',
                  message: 'Cette adresse courriel est déjà utilisée.',
               }
            }
            if (err.message?.includes('firstName') && err.message?.includes('lastName')) {
               throw {
                  type: 'CUSTOM',
                  name: 'Utilisateur existant',
                  message: 'Un utilisateur avec ce prénom et nom existe déjà.',
               }
            }
         }
         throw err
      }
   }

   /**
    * Update an existing user
    * @param {number} id - The user ID
    * @param {object} updates - Fields to update
    * @throws {object} Custom error if validation fails
    */
   static async update(id, updates) {
      const errors = await User.validateForUpdate(id, updates)
      if (errors.length > 0) {
         throw {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: errors.map(error => error.message).join(' '),
            errors,
         }
      }

      const updateData = {}

      if (updates.firstName !== undefined) {
         updateData.firstName = updates.firstName.trim()
      }

      if (updates.lastName !== undefined) {
         updateData.lastName = updates.lastName.trim()
      }

      if (updates.email !== undefined) {
         updateData.email = updates.email.toLowerCase().trim()
      }

      if (updates.category !== undefined) {
         updateData.category = updates.category
      }

      if (updates.active !== undefined) {
         updateData.active = Boolean(updates.active)
      }

      if (Object.keys(updateData).length > 0) {
         await updateUser(id, updateData)
      }
   }
}

module.exports = User
