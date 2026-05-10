// global.$                = require(`../external/jquery.min`)

// Previous version that used jQuery and did not encode, diallowing layring returnTo's
// const returnTo = () => $(location).attr(`pathname`) + $(location).attr(`search`)

const returnTo = () => {
   const { pathname, search, hash } = window.location
   return encodeURIComponent(`${pathname}${encodeURIComponent(search)}${hash}`)
}

module.exports = {
   returnTo,
}