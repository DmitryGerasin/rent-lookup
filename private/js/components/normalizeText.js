const normalizeText = (text) => {
   const supportsUnicodeProps = (() => {
      try {
         new RegExp("\\p{Diacritic}", "u")
         return true
      } catch {
         return false
      }
   })()

   const diacriticPattern = supportsUnicodeProps
      ? /\p{Diacritic}/gu
      : /[\u0300-\u036f]/g

   return text
      .replace(/['’`]/g, "'")  // normalize apostrophes
      .normalize("NFD")        // separate letters from diacritics
      .replace(diacriticPattern, "") // remove diacritics
      .replace(/-/g, " ")      // treat hyphens as spaces
      .replace(/\s+/g, " ")    // collapse multiple spaces
      .trim()
      .toLowerCase()           // case-insensitive
}

module.exports = {
   normalizeText,
}