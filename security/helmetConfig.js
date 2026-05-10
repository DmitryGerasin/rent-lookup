const helmet = require('helmet')

const recaptchaDirectives = {
   scriptSrcElem: [
      "https://www.google.com/recaptcha/", // recaptcha api (views/login/index.ejs, views/register/index.ejs)
      "https://www.gstatic.com/recaptcha/", // recaptcha runtime (views/login/index.ejs, views/register/index.ejs)
   ],
   frameSrc: [
      "https://www.google.com/recaptcha/", // recaptcha (views/login/index.ejs, views/register/index.ejs)
   ],
   connectSrc: [
      "https://www.google.com/recaptcha/", // recaptcha (views/login/index.ejs, views/register/index.ejs)
   ],
}

/**
 * Normally, `style-src-elem` controls `<style>` tags, and 
 * `<link rel="stylesheet" href="...">` elements. However on Safari and mobile 
 * browsers this is not implemented correctly, so we need to set the fallback 
 * `style-src` to mirror the `style-src-elem` directives.
 * 
 * Otherwise, style-src would be set to `"'none'"`.
 */
const styleSrcDirectives = [
   "'self'",
   "https://fonts.googleapis.com", // style-src-elem: views/rtbc.ejs, views/reports/timeActivities/index.ejs, views/dashboard/index.ejs, views/all.ejs, views/admin/invoiceNow.ejs, views/error.ejs, views/file/index.ejs (historical), views/dragon/index.ejs (historical), views/trust/clientCard.ejs
   "https://bootswatch.com/4/lux/bootstrap.min.css", // views/trust/clientCard.ejs, views/trust/monthlyReport.ejs
   "https://use.fontawesome.com/releases/v5.6.3/css/all.css", // views/trust/clientCard.ejs, views/trust/monthlyReport.ejs
]

const helmetConfig = helmet({
   contentSecurityPolicy: {
      directives: {
         baseUri: ["'self'"], // Specifies the base URI that is used to resolve relative URLs.

         defaultSrc: ["'none'"], // General fallback: block all default-src where not explicitly set.

         scriptSrc: ["'none'"], // General fallback: block classic script-src where not overridden by scriptSrcElem

         scriptSrcAttr: [ // Controls inline script attributes (e.g., <button onclick="...">).
            "'none'",
         ],

         scriptSrcElem: [ // Controls <script> tags and <script src="..."> attributes.
            "'self'",
            ...recaptchaDirectives.scriptSrcElem,
         ],

         styleSrc: [ // General fallback for style-src (but not in Safari and mobile browsers, see comment on styleSrcDirectives)
            ...styleSrcDirectives
         ],

         styleSrcAttr: [ // Controls inline style attributes (e.g., <div style="...">).
            "'unsafe-inline'",
            // "'none'",
         ],

         styleSrcElem: [ // Controls <style> tags, and <link rel="stylesheet" href="..."> elements.
            ...styleSrcDirectives,
         ],

         fontSrc: [ // Controls the sources that are allowed to load fonts.
            "https://use.fontawesome.com", // font-src: views/trust/clientCard.ejs
            "https://fonts.gstatic.com", // font-src: views/rtbc.ejs, views/reports/timeActivities/index.ejs, views/dashboard/index.ejs, views/all.ejs, views/admin/invoiceNow.ejs, views/error.ejs; historical meta: views/file/index.ejs, views/dragon/index.ejs; also views/trust/clientCard.ejs
         ],

         frameAncestors: ["'self'"], // Which origins are allowed to embed this page inside a <frame>, <iframe>, <embed>, or <object>. This is the reverse of frame-src.

         frameSrc: [ // Which URLs can be loaded inside a <frame> or <iframe> on this page.
            "'self'",
            ...recaptchaDirectives.frameSrc,
         ],

         connectSrc: [ // fetch() requests can only be made to the sources listed here.
            "'self'",
            ...recaptchaDirectives.connectSrc,
         ],

         imgSrc: [ // Controls the sources that are allowed to load images.
            "'self'",
         ],

         formAction: [ // Controls the action attribute of <form> elements.
            "'none'", // disable all form actions, since they are always handled via jquery validation > rest.js > fetch().
         ],

         objectSrc: [ // This directive restricts the sources allowed to load plugins via <object>, <embed>, or <applet> elements. Setting object-src 'none' is recommended to block all plugins.
            "'none'",
         ],

         mediaSrc: [ // Controls the sources that are allowed to load media (<audio>, <video>).
            "'none'", // block all media sources
         ],

         workerSrc: [ // Dedicated Workers, SharedWorkers, and ServiceWorkers.
            "'none'",
         ],

         // Legacy CSP2 directive; in modern browsers nested frames use frame-src and workers use worker-src (both set above).
         // Kept explicit so behavior does not rely on default-src alone in older parsers.
         childSrc: [
            "'none'",
         ],

         // Web App Manifest (<link rel="manifest" href="...">). Repo has no manifests today; loosen to ['self'] if you add one.
         manifestSrc: [
            "'none'",
         ],

         upgradeInsecureRequests: [], // This directive tells browsers to upgrade insecure requests to secure ones.

         /*
          * Omitted CSP directives (review as needed):
          * - navigate-to: restricts document-initiated navigations; easy to break real apps—only add with care.
          * 
          * - report-uri / report-to: violation reporting endpoints.
          *    CSP reports disabled for now, they will be sent to a separate server
          *    in the future for security reasons (CSP report endpoints are 
          *    unauthenticated, attacker-controlled (public ingestion API, hostile input)
          *
          *    NEVER:
          *    - trigger alerts blindly
          *    - store raw data w/o validation
          *    - trust fields (blocked-uri, document-uri, etc.)
          *
          *    REQUIRE:
          *    - strict JSON parsing (NO default express.json() w/o limits)
          *    - schema validation (Ajv)
          *    - input normalization
          *    - safe logging (NO raw input)
          *
          *    VULNS:
          *    - prototype pollution
          *    - log injection
          *    - stored XSS (dashboard)
          *    - SSRF (URL processing)
          *    - JSON bomb / resource exhaustion
          *
          *    TODO (future impl on separate ingestion server):
          *    - POST only
          *    - strict Content-Type enforcement
          *    - drop suspicious patterns
          *    - payload size limits
          *    - isolate domain (no cookies/auth)
          * 
          * - trusted-types / require-trusted-types-for: Trusted Types (defense-in-depth for DOM XSS); requires app changes.
          * 
          * - sandbox: applies a sandbox to the protected document—usually incompatible with a full app shell.
          * 
          * - webrtc 'allow' / 'block' (experimental; Chrome): only if you need to lock down WebRTC.
          * 
          * - fenced-frame-src: Privacy Sandbox fenced frames—only if you use that API surface.
          * 
          */
      },
   },

   crossOriginResourcePolicy: {
      policy: "same-site", // to allow use in iframe (/dragon/:fileId)
   },

   referrerPolicy: { 
      /**
       * Sets same-origin so same-origin requests include Referer while cross-origin requests 
       * do not. `security/csrf.js` uses this as a fallback when browsers omit Origin on 
       * same-origin GET requests.
       */
      policy: "same-origin",
   },

   hsts: {
      maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
      includeSubDomains: true, 
      preload: true, // to enable preloading HSTS for all subdomains
   },

   /**
    * "X-Content-Type-Options: nosniff"
    * 
    * This header is used to prevent MIME type sniffing.
    * It defaults to nosniff.
    */

   /**
    * "X-Frame-Options: SAMEORIGIN"
    * 
    * This header is used to prevent framing of the page.
    * It is superseded by the frame-ancestors Content Security Policy 
    * directive.
    * It defaults to SAMEORIGIN.
    */

   /**
    * "Cross-Origin-Opener-Policy: same-origin"
    * 
    * This header is used to control the Cross-Origin Opener Policy.
    * It defaults to same-origin. (Documents with same-origin will only open 
    * and be opened in the same BCG if both documents are same-origin and 
    * have the same-origin directive.)
    * NOTE: This could block popups, possibly preventing OAuth2 login flows.
    */

   /**
    * "Origin-Agent-Cluster: ?1"
    *
    * This header is used to control the Origin Agent Cluster.
    * It defaults to ?1. (Provides a mechanism to allow web applications to 
    * isolate their origins from other processes.)
    */

   /**
    * "X-DNS-Prefetch-Control: off"
    * 
    * This header is used to control the DNS Prefetching.
    * It defaults to off. (DNS prefetching is disabled.)
    */

   /**
    * "X-Permitted-Cross-Domain-Policies: none"
    * 
    * This header is used to control the Permitted Cross-Domain Policies.
    * The X-Permitted-Cross-Domain-Policies header tells some clients (mostly 
    * Adobe products) your domain's policy for loading cross-domain content. 
    * It defaults to none. (No cross-domain policies are permitted.)
    */

   /**
    * "X-Download-Options: noopen"
    * 
    * This header is used to control the Download Options (IE8-only).
    * It defaults to noopen. (Downloading files is disabled.)
    */

   /**
    * "X-Powered-By"
    * 
    * Helmet removes the X-Powered-By header, which is set by default in Express.
    * The header is removed by default.
    */

   /**
    * "X-XSS-Protection: 0"
    * 
    * Helmet disables browsers' buggy cross-site scripting filter by setting 
    * the legacy X-XSS-Protection header to 0.
    * This header takes no options and is set by default.
    */
   
})

module.exports = {
   helmetConfig,
}
