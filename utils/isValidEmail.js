/**
 * Validate email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   return emailRegex.test(email)
}

module.exports = isValidEmail
