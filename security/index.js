/**
 * Central re-exports for security middleware and helpers.
 */


/**
 * Other security headers and middleware to consider:
 * 
 * - Subresource Integrity (SRI) 
 * (https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity) to verify the integrity of the resources loaded in the browser.
 * 
 * - XXE (https://portswigger.net/web-security/xxe)
 * Prevents XML External Entity (XXE) attacks by disabling the XML external entity feature.
 * 
 * - Monitor the event loop (DDoS Attack prevention) (https://www.npmjs.com/package/toobusy-js)
 * Prevents DDoS attacks by monitoring the event loop and blocking requests if the event loop is busy.
 * Used in app.js:
 * ```
 *    if (toobusy()) {
 *       res.send(503, "I'm busy right now, sorry.");
 *    } else {
 *       next();
 *    }
 * ```
 */

module.exports = {
   ...require('./IPwhitelist'),
   ...require('./rateLimiter'),
   ...require('./helmetConfig'),
   csrf: require('./csrf'),
   logRequest: require('./logRequest'),
}

// Shared validators: import `security/validator.js` where needed (not middleware — file-id patterns + positive-integer PK guards).
