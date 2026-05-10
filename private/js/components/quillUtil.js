const Delta = require(`quill-delta`)

/**
 * @param {object|string|Delta} a - Json object representing a Delta or a stringified Delta or a Delta object
 * @param {object|string|Delta} b - Json object representing a Delta or a stringified Delta or a Delta object
 * @returns {boolean} - True if the deltas are equal, false otherwise
 */
const isDeltaEqual = (a, b) => {
   const aDelta = new Delta(a)
   const bDelta = new Delta(b)
   return aDelta.diff(bDelta).ops.length === 0
}

module.exports = {
   isDeltaEqual,
}