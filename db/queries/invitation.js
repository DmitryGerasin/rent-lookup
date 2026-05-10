/**
 * Invitation Queries
 * 
 * Database operations for the _Invitation table.
 * Uses async/await pattern with connection pooling.
 */

const { mainPool } = require('../connections')
const promisePool = mainPool.promise()

/**
 * Save a new invitation to the database
 * @param {object} invitation - The invitation data
 * @returns {Promise<number>} The inserted invitation ID
 */
const saveInvitation = async (invitation) => {
   const connection = await promisePool.getConnection()
   try {
      const [result] = await connection.query(`INSERT INTO _Invitation SET ?`, [invitation])
      return result.insertId
   } finally {
      connection.release()
   }
}

/**
 * Get an invitation by its token hash
 * @param {string} tokenHash - The SHA-256 hash of the token
 * @returns {Promise<object|null>}
 */
const getInvitationByTokenHash = async (tokenHash) => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(
         `SELECT * FROM _Invitation WHERE tokenHash = ?`,
         [tokenHash]
      )
      return rows.length > 0 ? rows[0] : null
   } finally {
      connection.release()
   }
}

/**
 * Get an invitation by ID
 * @param {number} id - The invitation ID
 * @returns {Promise<object|null>}
 */
const getInvitationById = async (id) => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(
         `SELECT * FROM _Invitation WHERE id = ?`,
         [id]
      )
      return rows.length > 0 ? rows[0] : null
   } finally {
      connection.release()
   }
}

/**
 * Update invitation status by token hash
 * @param {string} tokenHash - The token hash
 * @param {string} status - New status ('pending', 'used', 'revoked')
 * @returns {Promise<void>}
 */
const updateInvitationStatus = async (tokenHash, status) => {
   const connection = await promisePool.getConnection()
   try {
      await connection.query(
         `UPDATE _Invitation SET status = ?, usedAt = ${status === 'used' ? 'NOW()' : 'NULL'} WHERE tokenHash = ?`,
         [status, tokenHash]
      )
   } finally {
      connection.release()
   }
}

/**
 * Update invitation status by ID
 * @param {number} id - The invitation ID
 * @param {string} status - New status ('pending', 'used', 'revoked')
 * @returns {Promise<void>}
 */
const updateInvitationStatusById = async (id, status) => {
   const connection = await promisePool.getConnection()
   try {
      await connection.query(
         `UPDATE _Invitation SET status = ?, usedAt = ${status === 'used' ? 'NOW()' : 'NULL'} WHERE id = ?`,
         [status, id]
      )
   } finally {
      connection.release()
   }
}

/**
 * Get all pending invitations (not expired, status = pending)
 * Includes inviter info
 * @returns {Promise<Array>}
 */
const getPendingInvitations = async () => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(`
         SELECT i.*, u.firstName as inviterFirstName, u.lastName as inviterLastName 
         FROM _Invitation i
         LEFT JOIN _User u ON i.inviterUserId = u.id
         WHERE i.status = 'pending' AND i.expiresAt > NOW()
         ORDER BY i.createdAt DESC
      `)
      return rows
   } finally {
      connection.release()
   }
}

/**
 * Get all invitations with inviter info
 * @returns {Promise<Array>}
 */
const getAllInvitations = async () => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(`
         SELECT i.*, u.firstName as inviterFirstName, u.lastName as inviterLastName 
         FROM _Invitation i
         LEFT JOIN _User u ON i.inviterUserId = u.id
         ORDER BY i.createdAt DESC
      `)
      return rows
   } finally {
      connection.release()
   }
}

/**
 * Get a pending invitation by email
 * @param {string} email - The email address (should be lowercase)
 * @returns {Promise<object|null>}
 */
const getPendingInvitationByEmail = async (email) => {
   const connection = await promisePool.getConnection()
   try {
      const [rows] = await connection.query(
         `SELECT * FROM _Invitation WHERE LOWER(email) = ? AND status = 'pending' AND expiresAt > NOW()`,
         [email]
      )
      return rows.length > 0 ? rows[0] : null
   } finally {
      connection.release()
   }
}

module.exports = {
   saveInvitation,
   getInvitationByTokenHash,
   getInvitationById,
   updateInvitationStatus,
   updateInvitationStatusById,
   getPendingInvitations,
   getAllInvitations,
   getPendingInvitationByEmail,
}
