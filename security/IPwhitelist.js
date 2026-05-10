const errorCodes           = require(`../middleware/errorCodes`)
const whitelist            = require(`../config/ip.json`)
const {
   PRODUCTION,
   USE_IP_WHITELIST,
}                       = require(`../config`)

const normalizeIp = (ip = ``) => String(ip).replace(/^::ffff:/, ``)

/**
 * Checks if the IP is a loopback IP. (i.e. 127.0.0.1 or ::1)
 */
const isLoopbackIp = (ip) => {
   const value = normalizeIp(ip)
   return value === `127.0.0.1` || value === `::1`
}

/**
 * Identifies the client based on the IP addresses in the whitelist.
 * @param {string} ip - The IP address to identify the client by.
 * @returns {string|null} - The name of the client or null if no match is found.
 */
const identifyClient = (ip) => {
   const normalizedIp = normalizeIp(ip)
 
   for (const [ipAddress, name] of Object.entries(whitelist)) {
     if (normalizedIp === normalizeIp(ipAddress)) return name
   }
 
   return null
}

module.exports = {
   ensureIPWhitelisted: (req, res, next) => {
      // Get the IP address of the client that is connecting to the server 
      // (supposed to be client IP in development and nginx IP in production)
      const directPeerIp = normalizeIp(req.socket?.remoteAddress || ``)

      // In production, the app should only be reachable through local nginx.
      if (PRODUCTION && !isLoopbackIp(directPeerIp)) {
         console.error(`!!ALERT!! direct access attempt from >>${directPeerIp || `unknown`}<<`)
         return errorCodes(res, 403, `${req.headers.host} is not available`)
      }

      // In production, req.ip comes from trust proxy + X-Forwarded-For.
      // In development, use the direct socket address.
      const clientIp = normalizeIp(PRODUCTION ? req.ip : directPeerIp)
      const ipAddressBelongsTo = identifyClient(clientIp)

      // If the IP address is not in the whitelist, we return a 403 error.
      if (USE_IP_WHITELIST && ipAddressBelongsTo === null) {
         console.error(`!!ALERT!! IP is >>${clientIp}<<, NO match found`)
         return errorCodes(res, 403, `${req.headers.host} is not available`)
      }

      res.locals.clientIp = clientIp
      res.locals.peerIp = directPeerIp
      res.locals.ipAddressBelongsTo = ipAddressBelongsTo
      next()
   }
}
