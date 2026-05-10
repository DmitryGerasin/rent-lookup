#!/usr/bin/env node
'use strict'

/**
 * Copies vendored JS from node_modules into public/js/vendors/ for <script src> tags.
 * Run automatically after npm install (postinstall).
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const destDir = path.join(root, 'public', 'js', 'vendors')

/** @type {Array<[string, string]>} [relativeSourceFromRoot, destFileName] */
const copies = [
   ['node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'],
   ['node_modules/jquery/dist/jquery.min.js', 'jquery.min.js'],
   ['node_modules/chart.js/dist/chart.umd.min.js', 'chart.umd.min.js'],
]

fs.mkdirSync(destDir, { recursive: true })

for (const [rel, name] of copies) {
   const src = path.join(root, rel)
   const dest = path.join(destDir, name)
   if (!fs.existsSync(src)) {
      console.warn(`sync-vendor-assets: skip missing ${rel} (install deps and re-run: node scripts/sync-vendor-assets.js)`)
      continue
   }
   fs.copyFileSync(src, dest)
   console.log(`sync-vendor-assets: ${name}`)
}
