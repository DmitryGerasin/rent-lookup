const {
   REGISTRY_BBOX_SCALE_DEFAULT,
} = require(`../config/rentalAnalysis`)

const RENTAL_REGISTRY_BASE = 'https://rentalregistry.ca/api/v1'

const makeBox = (latitude, longitude, scale) => {

   const first =  "45.533649805020566, -73.60328456755371,"
   const second = "45.528256405522630, -73.62598897737197"
   const third =  "45.521413329510516, -73.64877483244629"
   const diff = [
      0.0053933995,   0.02270440981,
      -0.00684307601, -0.02278585507,
   ]
   return [
      [`${Number(latitude) + (diff[0] * scale)}`.padEnd(18, '0'), `${Number(longitude) + (diff[1] * scale)}`.padEnd(18, '0')],
      [`${Number(latitude) + (diff[2] * scale)}`.padEnd(18, '0'), `${Number(longitude) + (diff[3] * scale)}`.padEnd(18, '0')],
   ]
}

/**
 * @param {{ lat: number, lng: number }} centerCoordinates Geocoded center of the search bbox
 * @param {number} [scale] Clamped bbox multiplier; bounds live in `config/rentalAnalysis.js`
 */
const getHousings = async (
   centerCoordinates,
   scale = REGISTRY_BBOX_SCALE_DEFAULT,
) => {
   const boxCoordinates = makeBox(
      centerCoordinates.lat,
      centerCoordinates.lng,
      scale,
   )

   const url = `${RENTAL_REGISTRY_BASE}/housings/${boxCoordinates[0][0]},${boxCoordinates[0][1]},${boxCoordinates[1][0]},${boxCoordinates[1][1]}`
   const res = await fetch(url)
   const data = await res.json()
   const n = Array.isArray(data?.data?.housings) ? data.data.housings.length : 0
   console.log(`RentalRegistry: housings count = ${n}`)

   // Persist
   const fs = require('fs')
   fs.writeFileSync('./data.json', JSON.stringify(data, null, 2), 'utf8')

   return data
}

module.exports = {
   getHousings,
}