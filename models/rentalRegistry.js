const {
   REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT,
}                       = require('../config/rentalAnalysis')
const {
   cornersForSquareSearchBox,
}                       = require('./registrySearchBox')

const RENTAL_REGISTRY_BASE = 'https://rentalregistry.ca/api/v1'

function formatRegistryCoordinate(value) {
   const n = Number(value)
   if (!Number.isFinite(n)) {
      return `0`
   }
   return n.toFixed(9).replace(/\.?0+$/, ``)
}

/**
 * @param {{ lat: number, lng: number }} centerCoordinates Geocoded center of the search bbox
 * @param {number} [edgeLengthMeters] Square side length; bounds in `config/rentalAnalysis.js`
 */
const getHousings = async (
   centerCoordinates,
   edgeLengthMeters = REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT,
) => {
   const { bottomLeft: southWest, topRight: northEast } = cornersForSquareSearchBox(
      centerCoordinates,
      edgeLengthMeters,
   )

   // Registry API: bbox corners northEast → southWest (lat,lng,lat,lng).
   const latLngPairs = [
      [northEast.lat, northEast.lng],
      [southWest.lat, southWest.lng],
   ].map(([lat, lng]) => [
      formatRegistryCoordinate(lat),
      formatRegistryCoordinate(lng),
   ])

   const url = `${RENTAL_REGISTRY_BASE}/housings/${latLngPairs[0][0]},${latLngPairs[0][1]},${latLngPairs[1][0]},${latLngPairs[1][1]}`
   const res = await fetch(url)
   const data = await res.json()
   const n = Array.isArray(data?.data?.housings) ? data.data.housings.length : 0
   console.log(`RentalRegistry: housings count = ${n}`)

   return data
}

module.exports = {
   getHousings,
}
