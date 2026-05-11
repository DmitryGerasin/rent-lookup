const { moveTo }        = require('geolocation-utils')

/** Compass headings accepted by `moveTo` (degrees): N=0, E=90, S=180, W=270. */
const HEADING_NORTH = 0
const HEADING_EAST = 90
const HEADING_SOUTH = 180
const HEADING_WEST = 270

// Latitude: North is positive, South is negative
// Longitude: East (right) is positive, West (left) is negative

/**
 * Axis-aligned square on the WGS84 spheroid: from the center, walk half the edge length
 * south then west for the bottom-left corner, and north then east for the top-right corner.
 *
 * Uses `geolocation-utils` {@link moveTo} for meter offsets (approximate).
 *
 * @param {{ lat: number, lng: number }} centerCoordinates Geocoded center point
 * @param {number} edgeLengthMeters Full side length of the square (width = height)
 * @returns {{ bottomLeft: { lat: number, lng: number }, topRight: { lat: number, lng: number } }} SW and NE corners; the registry expects NE then SW in the URL.
 */
function cornersForSquareSearchBox(centerCoordinates, edgeLengthMeters) {
   const half = edgeLengthMeters / 2
   const center = { lat: centerCoordinates.lat, lng: centerCoordinates.lng }


   const southWest = moveTo(
      moveTo(center, { heading: HEADING_SOUTH, distance: half }),
      { heading: HEADING_WEST, distance: half },
   )

   const northEast = moveTo(
      moveTo(center, { heading: HEADING_NORTH, distance: half }),
      { heading: HEADING_EAST, distance: half },
   )

   return {
      bottomLeft: { lat: southWest.lat, lng: southWest.lng },
      topRight: { lat: northEast.lat, lng: northEast.lng },
   }
}

module.exports = {
   cornersForSquareSearchBox,
}
