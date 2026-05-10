/**
 * User Queries
 * 
 * Database operations for the _User table.
 * Excludes sensitive fields: password, qboAccessToken, qboRefreshToken, qboTokenType, qboData
 */

const { mainPool }      = require('../connections')
const sqlStringAddition = require('./querySearchCriteria')
const promisePool       = mainPool.promise()

const USER_SELECT = `
   id AS userID,
   createdAt AS dateCreated,
   firstName,
   lastName,
   email,
   category,
   active
`

/**
 * Get a single user by ID (excludes sensitive fields)
 * @param {number|string} id - The user ID
 * @returns {Promise<object|null>} User object or null
 */
const getUser = async (id) => {
   const query = `
      SELECT ${USER_SELECT}
      FROM _User
      WHERE id = ?
   `
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(query, [id])
      if (rows.length === 0) return null
      const user = rows[0]
      if (user.dateCreated !== null) {
         user.dateCreated = JSON.stringify(user.dateCreated).slice(1, 11)
      }
      return user
   } finally {
      connection.release()
   }
}

/**
 * Get a user by their linked employee ID
 * @param {number} employeeId - The employee ID
 * @returns {Promise<object|null>} User object or null
 */
const getUserByEmployeeId = async (employeeId) => {
   const query = `
      SELECT ${USER_SELECT}
      FROM _User u
      INNER JOIN _Employee e ON e.userId = u.id
      WHERE e.id = ?
   `
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(query, [employeeId])
      if (rows.length === 0) return null
      const user = rows[0]
      if (user.dateCreated !== null) {
         user.dateCreated = JSON.stringify(user.dateCreated).slice(1, 11)
      }
      return user
   } finally {
      connection.release()
   }
}

/**
 * Search users by criteria (excludes sensitive fields)
 * @param {object} criteria - Key-value pairs to search for
 * @param {boolean} showAll - If true, returns all users
 * @returns {Promise<Array>} Array of user objects
 */
const searchUser = async (criteria, showAll) => {
   // Purge criteria of any fields that are not allowed to be searched on
   const disallowedFields = ['password', 'qboAccessToken', 'qboRefreshToken', 'qboTokenType', 'qboData']
   if (criteria && typeof criteria === 'object') {
      for (const field of disallowedFields) {
         if (criteria.hasOwnProperty(field)) {
            delete criteria[field]
         }
      }
   }

   const query = `
      SELECT ${USER_SELECT}
      FROM _User
   ` + sqlStringAddition(criteria, showAll)

   const connection = await promisePool.getConnection()
   try {
      const [results] = await connection.query(query)
      results.forEach(one => {
         if (one.dateCreated !== null) {
            one.dateCreated = JSON.stringify(one.dateCreated).slice(1, 11)
         }
      })
      return results
   } finally {
      connection.release()
   }
}

/**
 * Check if a user exists with the given email (case-insensitive)
 * @param {string} email - Email to check
 * @returns {Promise<boolean>}
 */
const userExistsByEmail = async (email) => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(
         `SELECT 1 FROM _User WHERE LOWER(email) = LOWER(?)`,
         [email]
      )
      return rows.length > 0
   } finally {
      connection.release()
   }
}

/**
 * Check if a user exists with the given firstName and lastName
 * @param {string} firstName
 * @param {string} lastName
 * @returns {Promise<boolean>}
 */
const userExistsByName = async (firstName, lastName) => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(
         `SELECT 1 FROM _User WHERE firstName = ? AND lastName = ?`,
         [firstName, lastName]
      )
      return rows.length > 0
   } finally {
      connection.release()
   }
}

/**
 * Insert a new user
 * @param {object} data - User data (firstName, lastName, email, password, category, active)
 * @returns {Promise<number>} Inserted user ID
 */
const saveUser = async (data) => {
   // 1. normalize values for CHECK constraints
   if (data.category === '') data.category = 'unassigned'

   const connection = await promisePool.getConnection()
   try {
      const [result] = await connection.query(`INSERT INTO _User SET ?`, [data])
      return result.insertId
   } finally {
      connection.release()
   }
}

/**
 * Update user (only allowed fields: firstName, lastName, email, category, active)
 * @param {number} id - The user ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
const updateUser = async (id, updates) => {
   const allowed = ['firstName', 'lastName', 'email', 'category', 'active']
   const updateData = {}
   for (const key of allowed) {
      if (updates[key] !== undefined) {
         updateData[key] = updates[key]
      }
   }
   if (Object.keys(updateData).length === 0) return

   const connection = await promisePool.getConnection()
   try {
      await connection.query(`UPDATE _User SET ? WHERE id = ?`, [updateData, id])
   } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
         if(err.sqlMessage.includes('email')) throw {
            type: 'CUSTOM',
            name: 'Courriel déjà utilisé',
            message: 'Cette adresse courriel est déjà utilisée.',
         }
         if(err.sqlMessage.includes('firstName') || err.sqlMessage.includes('lastName')) throw {
            type: 'CUSTOM',
            name: 'Utilisateur existant',
            message: 'Un utilisateur avec ce prénom et nom existe déjà.',
         }
      }
      throw err
   } finally {
      connection.release()
   }
}

module.exports = {
   getUser,
   getUserByEmployeeId,
   searchUser,
   saveUser,
   updateUser,
   userExistsByEmail,
   userExistsByName,
}
