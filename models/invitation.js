/**
 * Invitation Model
 * 
 * Handles invitation-based registration for the application.
 * Admins can create invitations that are sent to potential users.
 * 
 * Security:
 * - Tokens are cryptographically secure (32 bytes = 256 bits)
 * - Only the SHA-256 hash of the token is stored in the database
 * - Tokens expire after 48 hours by default
 * - Emails are normalized to lowercase for case-insensitive handling
 */

const crypto            = require('crypto')
const { DateTime }      = require('luxon')
const { timeStamp }     = require('../utils/timeStamp')
const {
   INVITATION_TOKEN_EXPIRY_HOURS,
   VALID_ROLES,
}                       = require('../config')
const {
   saveInvitation,
   getInvitationByTokenHash,
   getInvitationById,
   updateInvitationStatusById,
   getPendingInvitations,
   getPendingInvitationByEmail,
   getAllInvitations,
}                       = require('../db/queries/invitation')
const {
   getUser,
   userExistsByEmail,
   userExistsByName,
}                       = require('../db/queries/user')
const { hashPassword }  = require('../security/passwordPolicy')
const { mainPool }      = require('../db/connections')
const companyName       = `Real Estate Company`
const isValidEmail      = require('../utils/isValidEmail')
const {
   PUBLIC_BASE_URL,
}                       = require('../config')

// Use promise-based pool for transactions
const pool = mainPool.promise()

/**
 * Invitation class for managing user invitations
 */
class Invitation {
   constructor() {
      // No instance state needed - class methods are stateless
   }

   static get GENERIC_INVITE_REGISTRATION_FAILURE() {
      return {
         type: 'CUSTOM',
         name: 'Erreur de validation',
         message: 'L’inscription n’a pas pu être complétée. Veuillez réessayer ou communiquer avec l’administrateur de votre cabinet.',
      }
   }

   /**
    * Generate a cryptographically secure token
    * @returns {string} Hex-encoded 32-byte token
    */
   static generateToken() {
      return crypto.randomBytes(32).toString('hex')
   }

   /**
    * Hash a token using SHA-256
    * @param {string} token - The token to hash
    * @returns {string} Hex-encoded SHA-256 hash
    */
   static hashToken(token) {
      return crypto.createHash('sha256').update(token).digest('hex')
   }

   /**
    * Get all invitations
    * @returns {Promise<Array>}
    * @throws {Error} If the query fails - let it propagate to router error handler
    */
   static async getAll() {
      return await getAllInvitations()
   }

   /**
    * Get all pending invitations
    * @returns {Promise<Array>}
    * @throws {Error} If the query fails - let it propagate to router error handler
    */
   static async getAllPending() {
      return await getPendingInvitations()
   }

   /**
    * Get an invitation by ID
    * @param {number} id - The invitation ID
    * @returns {Promise<object|null>}
    * @throws {Error} If the query fails - let it propagate to router error handler
    */
   static async getById(id) {
      return await getInvitationById(id)
   }

   /**
    * Create a new invitation
    * @param {object} data - Invitation data
    * @param {string} data.email - Email address of invitee
    * @param {string} data.role - Role to assign (admin, lawyer, paralegal, etc.)
    * @param {number} data.inviterUserId - User ID of the admin creating the invitation
    * @returns {Promise<{success: boolean, token?: string, invitation?: {
    *     id: number,
    *     email: string,
    *     role: string,
    *     expiresAt: Date|string,
    *   },
    *   error?: {
    *     type: 'CUSTOM' | 'NOT CUSTOM',
    *     name: string,
    *     message: string,
    *   }}>}
    */
   static async create({ email, role, inviterUserId }) {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim()

      // Validate inputs
      if (!normalizedEmail) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'L’adresse courriel est requise.',
         } }
      }
      if (!isValidEmail(normalizedEmail)) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'L’adresse courriel n’est pas valide.',
         } }
      }
      if (!role) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Le rôle est requis.',
         } }
      }
      if (!VALID_ROLES.includes(role)) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: `Le rôle doit être l’un des suivants: ${VALID_ROLES.join(', ')}`,
         } }
      }
      if (!inviterUserId) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'L’identifiant de l’inviteur est requis.',
         } }
      }

      // Check if email is already registered
      const emailRegistered = await userExistsByEmail(normalizedEmail)
      if (emailRegistered) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Cette adresse courriel est déjà enregistrée.',
         } }
      }

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingByEmail(normalizedEmail)
      if (existingInvitation) {
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Une invitation est déjà en attente pour cette adresse courriel.',
         } }
      }

      // Generate token and hash
      const token = Invitation.generateToken()
      const tokenHash = Invitation.hashToken(token)

      // Calculate expiry date
      const expiresAt = DateTime.now().plus({ hours: INVITATION_TOKEN_EXPIRY_HOURS })

      try {
         // Save invitation to database
         const invitation = {
            email: normalizedEmail,
            role,
            inviterUserId,
            tokenHash,
            expiresAt: expiresAt.toFormat('yyyy-MM-dd HH:mm:ss'),
            status: 'pending',
         }

         const insertId = await saveInvitation(invitation)

         console.log(`${timeStamp()} Invitation: Created invitation for ${normalizedEmail} (role: ${role}) by user ${inviterUserId}`)

         return {
            success: true,
            token, // Return the unhashed token for sending in email
            invitation: {
               id: insertId,
               email: normalizedEmail,
               role,
               expiresAt: expiresAt.toJSDate(),
            },
         }
      } catch (error) {
         console.error(`${timeStamp()} Invitation: Error creating invitation:`, error)
         return { success: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Une erreur est survenue lors de la création de l’invitation.',
         } }
      }
   }

   /**
    * Validate an invitation token
    * @param {string} token - The token to validate
    * @returns {Promise<{
    *   valid: boolean,
    *   invitation?: {
    *     id: number,
    *     email: string,
    *     role: string,
    *     expiresAt: Date|string,
    *     inviter?: {
    *       firstName: string,
    *       lastName: string,
    *     } | null
    *   },
    *   error?: {
    *     type: 'CUSTOM' | 'NOT CUSTOM',
    *     name: string,
    *     message: string,
    *   }
    * }>}
    */
   static async validate(token) {
      if (!token) {
         return { valid: false, error: {
            type: 'CUSTOM',
            name: 'Erreur de validation',
            message: 'Le jeton d’invitation est requis.',
         } }
      }

      const tokenHash = Invitation.hashToken(token)

      try {
         const invitation = await getInvitationByTokenHash(tokenHash)

         if (!invitation) {
            return { valid: false, error: {
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Le jeton d’invitation est invalide.',
            } }
         }

         if (invitation.status !== 'pending') {
            if (invitation.status === 'used') {
               return { valid: false, error: {
                  type: 'CUSTOM',
                  name: 'Erreur de validation',
                  message: 'Cette invitation a déjà été utilisée.',
               } }
            }
            if (invitation.status === 'revoked') {
               return { valid: false, error: {
                  type: 'CUSTOM',
                  name: 'Erreur de validation',
                  message: 'Cette invitation a été révoquée.',
               } }
            }
            return { valid: false, error: {
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Cette invitation n’est plus valide.',
            } }
         }

         // Check expiration
         const now = DateTime.now()
         const expiresAt = DateTime.fromJSDate(new Date(invitation.expiresAt))
         if (now > expiresAt) {
            return { valid: false, error: {
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Cette invitation a expiré.',
            } }
         }

         // Get inviter info
         const inviter = await getUser(invitation.inviterUserId)

         return {
            valid: true,
            invitation: {
               id: invitation.id,
               email: invitation.email,
               role: invitation.role,
               expiresAt: invitation.expiresAt,
               inviter: inviter ? {
                  firstName: inviter.firstName,
                  lastName: inviter.lastName,
               } : null,
            },
         }
      } catch (error) {
         console.error(`${cf.timeStamp()} Invitation: Error validating token:`, error)
         return { valid: false, error: { type: 'NOT CUSTOM' } }
      }
   }

   /**
    * Revoke an invitation
    * @param {number} invitationId - The invitation ID
    * @returns {Promise<{success: boolean, error?: {
    *     type: 'CUSTOM' | 'NOT CUSTOM',
    *     name: string,
    *     message: string,
    *   }}>}
    */
   static async revoke(invitationId) {
      try {
         const invitation = await getInvitationById(invitationId)
         if (!invitation) {
            return { success: false, error: {
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Invitation non trouvée.',
            } }
         }
         if (invitation.status !== 'pending') {
            return { success: false, error: {
               type: 'CUSTOM',
               name: 'Erreur de validation',
               message: 'Seules les invitations en attente peuvent être révoquées.',
            } }
         }

         await updateInvitationStatusById(invitationId, 'revoked')
         console.log(`${cf.timeStamp()} Invitation: Revoked invitation ${invitationId}`)
         return { success: true }
      } catch (error) {
         console.error(`${cf.timeStamp()} Invitation: Error revoking invitation:`, error)
         return { success: false, error: {
            type: 'NOT CUSTOM',
            name: 'Error revoking invitation',
            message: 'Une erreur est survenue lors de la révocation de l’invitation.',
         } }
      }
   }

   /**
    * Get a pending invitation by email
    * @param {string} email - The email address
    * @returns {Promise<object|null>}
    * @throws {Error} If the query fails - let it propagate to router error handler
    */
   static async getPendingByEmail(email) {
      return await getPendingInvitationByEmail(email.toLowerCase().trim())
   }

   /**
    * Build invitation email content (inner HTML fragment only — wrap with `mail.wrapHtml` in the router before send).
    * @param {object} options
    * @param {string} options.to - Recipient email
    * @param {string} options.token - Plain invitation token
    * @param {{ firstName: string, lastName: string }} options.inviter
    * @param {string} [options.role] - Invited role (optional; reserved for future copy tweaks)
    * @param {Date|string} options.expiresAt - Expiration
    * @returns {{
    *   to: string,
    *   registrationUrl: string,
    *   subject: string,
    *   text: string,
    *   htmlInner: string,
    * }}
    */
   static generateInvitationEmailData({ to, token, inviter, expiresAt }) {
      const registrationUrl = `${PUBLIC_BASE_URL}/users/register?t=${token}`

      const expiryDateTime = DateTime.fromJSDate(new Date(expiresAt))
      const expiryFormatted = expiryDateTime.setLocale(`fr-CA`).toLocaleString({
         year: `numeric`,
         month: `long`,
         day: `numeric`,
         hour: `2-digit`,
         minute: `2-digit`,
      })

      const subject = `Invitation à rejoindre ${companyName}`

      const text = `
Bonjour,

${inviter.firstName} ${inviter.lastName} vous invite à rejoindre l’équipe de ${companyName}.

Pour créer votre compte, veuillez cliquer sur le lien suivant :
${registrationUrl}

Cette invitation expire le ${expiryFormatted}.

Si vous n’avez pas demandé cette invitation, vous pouvez ignorer ce message.

Cordialement,
${companyName}
`

      const htmlInner = `
      <h2 class="nodemailer-invitation-title">Vous êtes invité(e) à rejoindre ${companyName}</h2>

      <p><strong>${inviter.firstName} ${inviter.lastName}</strong> vous invite à créer un compte.</p>

      <p class="nodemailer-invitation-cta-wrap">
         <a href="${registrationUrl}" class="nodemailer-btn-primary">Créer mon compte</a>
      </p>

      <p class="nodemailer-text-muted">
         Cette invitation expire le <strong>${expiryFormatted}</strong>.
      </p>

      <p class="nodemailer-text-muted">
         Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
         <a href="${registrationUrl}" class="nodemailer-link-plain">${registrationUrl}</a>
      </p>
   `

      return {
         to,
         registrationUrl,
         subject,
         text,
         htmlInner,
      }
   }

   /**
    * Revoke a pending invitation and create a new one with the same email and role (new token / expiry).
    * If revoke succeeds and create fails, the previous invitation remains revoked.
    *
    * @param {object} data
    * @param {number} data.invitationId
    * @param {number} data.inviterUserId - User performing the resend (becomes inviter on the new row)
    * @returns {Promise<{success: boolean, token?: string, invitation?: object, error?: object}>} Same shape as {@link Invitation.create}
    */
   static async resendInvitation({ invitationId, inviterUserId }) {
      const existingInvitation = await this.getById(invitationId)
      if (!existingInvitation) {
         return { success: false, error: {
            type: `CUSTOM`,
            name: `Erreur de validation`,
            message: `Invitation non trouvée.`,
         } }
      }
      if (existingInvitation.status !== `pending`) {
         return { success: false, error: {
            type: `CUSTOM`,
            name: `Erreur de validation`,
            message: `Seules les invitations en attente peuvent être renvoyées.`,
         } }
      }

      const revokeResult = await this.revoke(invitationId)
      if (!revokeResult.success) {
         return revokeResult
      }

      return await this.create({
         email: existingInvitation.email,
         role: existingInvitation.role,
         inviterUserId,
      })
   }

   /**
    * Register a new user from an invitation
    * Creates a _User row and marks the invitation used in one transaction.
    *
    * @param {object} data - Registration data
    * @param {string} data.token - The invitation token
    * @param {string} data.password - Raw password (will be hashed internally)
    * @param {string} data.firstName
    * @param {string} data.lastName
    * @returns {Promise<{success: boolean, error?: {
    *     type: 'CUSTOM' | 'NOT CUSTOM',
    *     name: string,
    *     message: string,
    *   }}>}
    */
   static async registerFromInvitation({ token, password, firstName, lastName }) {
      // Validate token first
      const validation = await this.validate(token)
      if (!validation.valid) {
         return { success: false, error: validation.error }
      }

      const { invitation } = validation
      const tokenHash = Invitation.hashToken(token)

      // Get a connection for the transaction
      const connection = await pool.getConnection()

      try {
         await connection.beginTransaction()

         // Check that the firstName and lastName are not already in the database
         const nameExists = await userExistsByName(firstName, lastName)
         if (nameExists) {
            await connection.rollback()
            return { success: false, error: GENERIC_INVITE_REGISTRATION_FAILURE }
         }

         // Check that the email is not already in the database
         const emailExists = await userExistsByEmail(invitation.email)
         if (emailExists) {
            await connection.rollback()
            return { success: false, error: GENERIC_INVITE_REGISTRATION_FAILURE }
         }

         // Hash the password
         const hashedPassword = await hashPassword(password)

         const userInsert = {
            firstName,
            lastName,
            email: invitation.email,
            password: hashedPassword,
            category: invitation.role,
            active: 1,
         }

         await connection.query(
            'INSERT INTO _User SET ?',
            userInsert
         )

         await connection.query(
            `UPDATE _Invitation SET status = 'used', usedAt = NOW() WHERE tokenHash = ?`,
            [tokenHash]
         )

         await connection.commit()

         console.log(`${cf.timeStamp()} Invitation: User registered successfully: ${invitation.email} (role: ${invitation.role})`)

         return { success: true }

      } catch (error) {
         await connection.rollback()
         console.error(`${cf.timeStamp()} Invitation: Error registering user ${invitation.email}:`, error)

         // Check for duplicate entry errors
         if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('email')) {
               return { success: false, error: GENERIC_INVITE_REGISTRATION_FAILURE }
            }
            if (error.message.includes('firstName') && error.message.includes('lastName')) {
               return { success: false, error: GENERIC_INVITE_REGISTRATION_FAILURE }
            }
         }

         return { success: false, error: {
            type: 'NOT CUSTOM',
            name: 'Error registering user',
            message: 'Une erreur est survenue lors de l’inscription.',
         } }
      } finally {
         connection.release()
      }
   }
}

module.exports = Invitation
