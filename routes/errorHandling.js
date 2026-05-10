const { timeStamp }     = require(`../utils/timeStamp`)
const errorCodes        = require(`../middleware/errorCodes`)
const path              = require(`path`)

/**
 * Generic error handling function for the entire router
 * @param {Object} req 
 * @param {Object} res 
 * @param {Error} err
 * @param {String} currentFilePath - Pass `__filename`
 * @param {String} functionName 
 * @param {`JSON`|`HTML`} responseFormat - Defaults to `JSON`
 */
const errHandling = (req, res, err, currentFilePath, functionName, responseFormat=`JSON`) => {
   const rootDirectory     = path.resolve(__dirname, `..`)
   const relativePath      = path.relative(rootDirectory, currentFilePath)
   
   console.error(`${timeStamp()} ${relativePath} --> ${functionName}() failed`, req.url, req.query, req.body, err)

   if(![`HTML`, `JSON`].includes(responseFormat)) {
      console.error(timeStamp(), err)
      throw `incorrect responseFormat value`
   }

   // CUSTOM ERRORS - their `name` and `message` are meant to be displayed to the user.
   if(err.type === `CUSTOM` && responseFormat === `JSON`) return res.send({ ok: false, error: err })
   if(err.type === `CUSTOM` && responseFormat === `HTML`) return errorCodes(res, err.code, err.message, err.name)

   // OTHER ERRORS - their contents should not be shown to the user
   console.error(timeStamp(), err)
   if(err.type !== `CUSTOM` && responseFormat === `JSON`) return res.send({
      ok: false,
      error: {
         name: `Une erreur inattendue est survenue.`,
         message: `Rafraîchissez la page et réessayez. Si l’erreur se répète, signalez-la.`,
      },
   })
   if(err.type !== `CUSTOM` && responseFormat === `HTML`) return errorCodes(res, 500)

}

module.exports = errHandling