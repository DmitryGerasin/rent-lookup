const path              = require(`path`)
const express           = require(`express`)
const {
   staticFilesMaxAge,
}                       = require(`../config`)

const publicDir = path.join(__dirname, `..`, `public`)

/**
 * **`express.Router`** that serves files from **`public/`** with cache headers, then short-circuits
 * **`*.map`** requests that fall through **`express.static`** (no matching file).
 *
 * Mount with **`app.use(mountPublicStatic)`** early in **`app.js`**, after body parsers and before
 * session (same position as prior inline middleware).
 *
 * DevTools and browsers often probe for source maps. Without this handler those URLs would reach
 * the authenticated app router and trigger auth side effects / noise. Paths that **do** resolve to
 * a `.map` file under **`public/`** are still served by **`express.static`** first.
 *
 * @type {import('express').Router}
 */
const mountPublicStatic = express.Router()

mountPublicStatic.use(express.static(publicDir, {
   maxAge: staticFilesMaxAge,
}))

mountPublicStatic.use((req, res, next) => {
   if (req.path.endsWith(`.map`)) return res.status(204).end()
   next()
})

module.exports = mountPublicStatic
