/**
 * @param {string} name - Environment variable name
 * @returns {string} The value as set in the environment (may be empty string)
 * @throws {Object} If the variable is not defined (`process.env[name] === undefined`)
 */
function requireEnv(name) {
   if (process.env[name] === undefined) {
      throw {
         name: 'MissingEnvError',
         message: `${name} environment variable is required`,
         type: 'NOT CUSTOM',
      }
   }
   return process.env[name]
}

/**
 * @param {string} name - Environment variable name
 * @returns {string} Non-empty string value
 * @throws {Object} If missing or empty (`String(value).length === 0`)
 */
function requireNonEmptyEnv(name) {
   const value = requireEnv(name)
   if (String(value).length === 0) {
      throw {
         name: 'MissingEnvError',
         message: `${name} environment variable is required`,
         type: 'NOT CUSTOM',
      }
   }
   return value
}

module.exports = { 
   requireEnv, 
   requireNonEmptyEnv,
}
