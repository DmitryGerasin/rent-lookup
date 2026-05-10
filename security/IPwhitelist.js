const errorCodes           = require(`../middleware/errorCodes`)
const whitelist            = require(`../config/ip.json`)
const {
   PRODUCTION,
   USE_IP_WHITELIST,
   APP_BEHIND_DOCKER_PROXY,
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
 * True for loopback or RFC1918-style private addresses (typical Docker bridge / LAN reverse proxy).
 */
const isPrivateNetworkPeer = (ip) => {
   const v = normalizeIp(ip)
   if (v === ``) return false
   if (isLoopbackIp(v)) return true
   if (/^10\./.test(v)) return true
   if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true
   if (/^192\.168\./.test(v)) return true
   return false
}

/** In production, the TCP peer in front of Express must look like local nginx (bare metal) or Docker bridge. */
const productionDirectPeerOk = (directPeerIp) =>
   APP_BEHIND_DOCKER_PROXY ? isPrivateNetworkPeer(directPeerIp) : isLoopbackIp(directPeerIp)

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

      // In production, the peer should be loopback (nginx on same host) or a private/Docker address when
      // APP_BEHIND_DOCKER_PROXY=true. Development unchanged (PRODUCTION is false).
      if (PRODUCTION && !productionDirectPeerOk(directPeerIp)) {
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
