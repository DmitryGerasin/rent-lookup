const { csrf } = require('../security')

const globalErrorHandler = (err, req, res, next) => {
   if (csrf.handleInvalidCsrfTokenError(err, req, res)) return

   next(err)
}

module.exports = {
   globalErrorHandler,
}
