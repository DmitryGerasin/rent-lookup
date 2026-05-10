// current searchParams
const params = new Proxy(new URLSearchParams(window.location.search), {
   get: (searchParams, prop) => searchParams.get(prop),
})

// how to use: 
// let value = params.some_key; // "some_value"

module.exports = {
   params,
}