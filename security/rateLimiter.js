const {
   rateLimit,
   ipKeyGenerator,
}                       = require('express-rate-limit')
const whitelistIps      = require(`../config/ip.json`)

/**
 * Same key set as IPwhitelist / config/ip.json. Normalized so req.ip and file keys match.
 */
const normalizeIp = (ip) => {
   if (!ip) return ``
   const s = String(ip).trim()
   return s.startsWith(`::ffff:`) ? s.slice(7) : s
}

const WHITELISTED_IPS = new Set(
   Object.keys(whitelistIps).map((k) => normalizeIp(k.trim())),
)

const whitelisted = (ip) => WHITELISTED_IPS.has(normalizeIp(ip))

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const hdr = { standardHeaders: true, legacyHeaders: false }

// Logged-in users (search and everything else share this lane — generous on purpose)
const limiterUser = rateLimit({
   windowMs: WINDOW_MS,
   limit: 5000, // 5000 requests per 15 minutes
   keyGenerator: (req) => `user:${req.user.userID}`,
   ...hdr,
})

// Anonymous from office / known IPs (one bucket per public NAT)
const limiterTrustedAnon = rateLimit({
   windowMs: WINDOW_MS,
   limit: 300, // 300 requests per 15 minutes
   keyGenerator: (req) => `trusted:${ipKeyGenerator(req.ip)}`,
   ...hdr,
})

// Anonymous from unknown IPs (enough for 10+ login attempts)
const limiterAnon = rateLimit({
   windowMs: WINDOW_MS,
   limit: 100, // 100 requests per 15 minutes
   keyGenerator: (req) => `anon:${ipKeyGenerator(req.ip)}`,
   ...hdr,
})

/**
 * This function selects the appropriate limiter based on the request.
 * 
 * 1. If user is logged in, use generous user limiter per user.
 * 2. If IP is whitelisted, use trusted anon limiter per public NAT.
 * 3. If IP is not whitelisted, use anon limiter.
 */
const generalLimiter = (req, res, next) => {
   if (req.user?.userID) {
      return limiterUser(req, res, next)
   }
   if (whitelisted(req.ip)) {
      return limiterTrustedAnon(req, res, next)
   }
   return limiterAnon(req, res, next)
}

module.exports = {
   generalLimiter,
   whitelisted,
   normalizeIp,
}
