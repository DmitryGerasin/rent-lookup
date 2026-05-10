const path              = require(`path`)
const {
   appHomePage,
   SAFE_RETURN_PATH_PREFIXES,
}                       = require(`../config`)

const DEFAULT_MAX_LENGTH = 2048

/**
 * Returns a same-origin relative URL safe to use in redirects, links, and JSON `redirect` fields.
 * Call once per hop: optionally applies a single decodeURIComponent, then validates.
 *
 * @param {unknown} input
 * @param {{ defaultPath?: string, decode?: boolean, maxLength?: number }} [options]
 * @returns {string}
 */
function safeReturnPath(input, options = {}) {
   const {
      defaultPath = appHomePage,
      decode = true,
      maxLength = DEFAULT_MAX_LENGTH,
   } = options

   if (input === undefined || input === null) return defaultPath

   let stringifiedPath = String(input).trim()
   if (!stringifiedPath) return defaultPath
   if (stringifiedPath.length > maxLength) return defaultPath

   if (decode) {
      try {
         stringifiedPath = decodeURIComponent(stringifiedPath)
      } catch {
         return defaultPath
      }
      if (stringifiedPath.length > maxLength) return defaultPath
   }

   // Check if the path contains any control characters
   if (/[\u0000-\u001f\u007f]/.test(stringifiedPath)) return defaultPath
   if (!stringifiedPath.startsWith(`/`)) return defaultPath // Check if the path does not start with a slash
   if (stringifiedPath.startsWith(`//`)) return defaultPath // Check if the path starts with two slashes (is protocol-relative)
   if (stringifiedPath.includes(`\\`)) return defaultPath // Check if the path contains a backslash
   if (stringifiedPath.includes(`://`)) return defaultPath // Blocks absolute URLs in path or query (e.g. returnTo=https://…)

   const rawPathname = stringifiedPath.split(/[#?]/u)[0] || `` // Split the path at the first # or ?
   if (rawPathname.includes(`:`)) return defaultPath // Blocks javascript:, http: in the pathname only; query may contain ':'

   let pathname = path.posix.normalize(rawPathname) // Normalize the path
   if (!pathname.startsWith(`/`)) pathname = `/${pathname}` // Add a leading slash if the path does not start with one
   if (pathname.startsWith(`//`)) return defaultPath // Check if the path starts with two slashes (is protocol-relative)
   
   if (pathname === `/`) return defaultPath // Check if the path is the root path

   const prefixOk = SAFE_RETURN_PATH_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
   )
   if (!prefixOk) return defaultPath

   return stringifiedPath
}

module.exports = {
   safeReturnPath,
}
