/**
 * Get the CSRF token from the meta tag.
 * @returns {string} The CSRF token.
 * @throws {Error} If the CSRF token is not found.
 */
const getCsrfToken = () => {
   const csrfToken = $('meta[name="csrf-token"]').attr('content')
   if(!csrfToken) throw {
      name: 'CSRF Token Not Found',
      message: 'The CSRF token was not found. Please refresh the page and try again.',
      type: 'CUSTOM',
   }
   return csrfToken
}

const setCsrfToken = (csrfToken) => {
   const $meta = $('meta[name="csrf-token"]')
   if(!$meta.length || !csrfToken) throw {
      name: 'CSRF Token Not Found',
      message: 'The CSRF token was not found. Please refresh the page and try again.',
      type: 'CUSTOM',
   }
   $meta.attr('content', csrfToken)
}

const isStaleCsrfResponse = (res) => {
   return !res.ok && (
      res.code === 'CSRF_INVALID' ||
      (res.error && res.error.code === 'CSRF_INVALID')
   )
}

const fetchFreshCsrfToken = async () => {
   const res = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
         'Content-Type': 'application/json',
      },
   }).then(r => r.json())

   if(!res.ok) throw res.error

   const csrfToken = res.data && res.data.csrfToken
   setCsrfToken(csrfToken)
   return csrfToken
}

const fetchJsonOrRefreshCsrf = async (url, options, retried=false) => {
   const res = await fetch(url, options).then(r => r.json())

   if(isStaleCsrfResponse(res) && !retried) {
      const csrfToken = await fetchFreshCsrfToken()
      if(options.headers && options.headers['X-CSRF-Token']) {
         options.headers['X-CSRF-Token'] = csrfToken
      }
      return fetchJsonOrRefreshCsrf(url, options, true)
   }

   if(!res.ok) throw res.error
   return res
}

/**
 * Make a GET request to the given URL.
 * @param {string} url 
 * @param {object} param1 
 * @param {boolean} param1.goToRedirect - Whether to redirect to the URL if the response has a redirect. Defaults to `true`.
 * @param {AbortSignal} param1.signal - Optional abort signal; create a controller in the caller and pass `controller.signal`.
 * @returns {Promise<object>} The response data.
 */
const GET = async (url, {goToRedirect=true, signal}={}) => {
   const options = {
      method: 'GET',
      credentials: 'include',
      headers: {
         'Content-Type': 'application/json'
      },
      signal,
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName('body')[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const POST = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `POST`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName('body')[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const PATCH = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `PATCH`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   if(goToRedirect && res.download) {
      let dlLink = document.createElement(`a`)
      dlLink.setAttribute(`href`, res.download)
      dlLink.setAttribute(`download`, res.docName)
      document.getElementsByTagName(`body`)[0].appendChild(dlLink)
      dlLink.click()
      dlLink.remove()
      return
   }
   
   return res.data
}

const DELETE = async (url, data, {goToRedirect=true}={}) => {
   const options = {
      method: `DELETE`,
      credentials: `include`,
      headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify(data),
   }
   
   const res = await fetchJsonOrRefreshCsrf(url, options)
   
   if(goToRedirect && res.redirect) {
      return window.location.href = res.redirect
   }

   return res.data
}

module.exports = {
   getCsrfToken,
   GET,
   POST,
   PATCH,
   DELETE,
}