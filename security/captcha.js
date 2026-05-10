const errorCodes        = require(`../middleware/errorCodes`)
const { stringify }     = require(`querystring`)
const {
   RECAPTCHA_SECRET_KEY,
}                       = require(`../config`)

const captchaErrorMsg = () => {
   return {
      name: 'Unauthorized',
      message: 'Vous devez passer reCAPTCHA pour procéder.',
      type: 'CUSTOM',
   }
}

function sendCaptchaError(req, res) {
   if (req.headers[`content-type`]?.includes(`application/json`)) {
      return res.status(401).json({ ok: false, error: captchaErrorMsg() })
   }
   return errorCodes(res, 401, captchaErrorMsg())
}

module.exports = {
   ensureCaptcha: async function(req, res, next) {
      // Check if capcha was used
      if (!req.body[`g-recaptcha-response`]) return sendCaptchaError(req, res)

      // Make a request to verifyURL
      const query = stringify({
         secret: RECAPTCHA_SECRET_KEY,
         response: req.body[`g-recaptcha-response`],
         remoteip: res.locals.xRealIP || req.connection?.remoteAddress
      })
      const verifyURL = `https://www.google.com/recaptcha/api/siteverify?${query}`
      const body = await fetch(verifyURL).then(res => res.json())   
      
      // If unsuccessful
      if (!body.success) return sendCaptchaError(req, res)

      // If successful
      return next()
   }
}