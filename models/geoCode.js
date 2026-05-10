require('dotenv').config({ quiet: true })
const {
   GEOCODIO_API_KEY,
   GEOCODIO_BASE,
} = require('../config')
const { timeStamp } = require('../utils/timeStamp')

/** Lowercase, trim, collapse spaces, strip accents for stable city/country comparisons. */
function normalizeComparable(value) {
   if (value == null || value === '') return ''
   return String(value)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
}

function isCanadaCountry(code) {
   const n = normalizeComparable(code)
   return n === 'ca' || n === 'canada'
}

function isQuebecProvince(code) {
   const n = normalizeComparable(code)
   return n === 'qc' || n === 'quebec'
}

/**
 * @param {string} street
 * @param {string} city
 * @param {string} postalCode
 * @returns {Promise<{ lat: number, lng: number }>}
 */
const getAddressCoordinates = async (street, city, postalCode) => {
   if (!GEOCODIO_API_KEY) throw new Error('Missing GEOCODIO_API_KEY')

   if (!street?.trim() || !city?.trim()) {
      throw new Error('street and city are required')
   }

   const params = new URLSearchParams({
      api_key: GEOCODIO_API_KEY,
      country: 'Canada',
      state: 'QC',
      street: street.trim(),
      city: city.trim(),
   })
   const pc = postalCode?.trim()
   if (pc) params.set('postal_code', pc)

   const url = `${GEOCODIO_BASE}/geocode?${params.toString()}`
   const res = await fetch(url)
   const data = await res.json()

   if (!res.ok) {
      const err = new Error(typeof data.error === 'string' ? data.error : res.statusText)
      err.status = res.status
      err.body = data
      throw err
   }

   const best = data.results?.[0]
   if (!best?.location) {
      throw new Error('No geocoding results for this address')
   }

   const ac = best.address_components ?? {}
   const country = ac.country
   const province = ac.state
   const resultCity = ac.city
   let warnings = []

   if (!isCanadaCountry(country)) {
      throw new Error(
         `Geocoded country does not match Canada (got ${JSON.stringify(ac)})`,
      )
   }
   if (!isQuebecProvince(province)) {
      throw new Error(
         `Geocoded province does not match Quebec (got ${JSON.stringify(ac)})`,
      )
   }
   if (normalizeComparable(resultCity) !== normalizeComparable(city)) {
      warnings.push(`Geocoded city does not match supplied city (got ${JSON.stringify(resultCity)}, expected ${JSON.stringify(city)})`)
   }

   return {
      lat: best.location.lat,
      lng: best.location.lng,
      warnings,
      formatted_address: best.formatted_address,
      address_components: ac,
   }
}

module.exports = { getAddressCoordinates, GEOCODIO_BASE }

if (require.main === module) {
   ;(async () => {
      try {
         const coords = await getAddressCoordinates(
            '4000, boulevard de Maisonneuve O',
            'Montreal',
            'H3Z 2X9',
         )
         console.log(coords)
      } catch (e) {
         console.error(e)
      }
   })()
}
