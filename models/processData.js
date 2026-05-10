const {
   RENT_ANALYSIS_MAX_RENT_MONTHLY,
   getRentAnalysisYearWindow,
} = require(`../config/rentalAnalysis`)

/**
 * Listing has a unit number (condo); empty or missing `apartment_number` → plex / townhouse slice.
 *
 * @param {object} listing Registry housing row
 */
function listingHasApartmentNumber(listing) {
   const unit = listing.apartment_number
   if (unit == null) return false
   if (typeof unit === `string` && unit.trim() === ``) return false
   return true
}

/**
 * Whether a listing is kept for averages, tables, and scatter (rent cap + calendar year window).
 *
 * @param {object} listing Registry housing row after registry filters
 */
function listingPassesRentAnalysisFilters(listing) {
   const closedBedrooms = parseInt(listing.number_of_closed_room, 10)
   const monthlyRent = parseFloat(listing.price)
   const listingYear = parseInt(listing.year, 10)
   const { yearMin, yearMax } = getRentAnalysisYearWindow()

   if (!Number.isFinite(closedBedrooms) || closedBedrooms < 0) return false
   if (
      !Number.isFinite(monthlyRent) ||
      monthlyRent <= 0 ||
      monthlyRent > RENT_ANALYSIS_MAX_RENT_MONTHLY
   ) {
      return false
   }
   if (
      !Number.isFinite(listingYear) ||
      listingYear < yearMin ||
      listingYear > yearMax
   ) {
      return false
   }
   return true
}

/**
 * Split scatter points by unit vs no-unit (same filters as global processing).
 *
 * @param {object[]} housingsList Raw `data.housings` from registry response
 */
function rentScatterPointsSplit(housingsList) {
   /** @type {Array<{ year: number, rent: number, bedrooms: number }>} */
   const condoPoints = []
   /** @type {Array<{ year: number, rent: number, bedrooms: number }>} */
   const plexTownhousePoints = []

   for (const listing of housingsList) {
      if (!listingPassesRentAnalysisFilters(listing)) continue

      const bedrooms = parseInt(listing.number_of_closed_room, 10)
      const rent = parseFloat(listing.price)
      const year = parseInt(listing.year, 10)
      const point = { year, rent, bedrooms }

      if (listingHasApartmentNumber(listing)) condoPoints.push(point)
      else plexTownhousePoints.push(point)
   }

   return { condo: condoPoints, plexTownhouse: plexTownhousePoints }
}

/**
 * Average rent per calendar year × bedroom count for one listing subset.
 *
 * @param {object[]} filteredListings Already passed {@link listingPassesRentAnalysisFilters}
 * @param {number} yearMinInclusive First calendar year column
 * @param {number} yearMaxInclusive Last calendar year column
 */
function buildBedroomsYearTable(filteredListings, yearMinInclusive, yearMaxInclusive) {
   /** @type {number[]} */
   const calendarYears = []
   for (
      let calendarYear = yearMinInclusive;
      calendarYear <= yearMaxInclusive;
      calendarYear++
   ) {
      calendarYears.push(calendarYear)
   }

   /** bedroomCount → (calendarYear → { sum, count }) */
   const aggregatesByBedroomAndYear = new Map()

   for (const listing of filteredListings) {
      const bedroomCount = parseInt(listing.number_of_closed_room, 10)
      const calendarYear = parseInt(listing.year, 10)
      const rent = parseFloat(listing.price)

      if (!aggregatesByBedroomAndYear.has(bedroomCount)) {
         aggregatesByBedroomAndYear.set(bedroomCount, new Map())
      }
      const byYear = aggregatesByBedroomAndYear.get(bedroomCount)
      const existing = byYear.get(calendarYear) || { sum: 0, count: 0 }
      existing.sum += rent
      existing.count += 1
      byYear.set(calendarYear, existing)
   }

   const rows = [...aggregatesByBedroomAndYear.keys()]
      .sort((left, right) => left - right)
      .map((bedroomCount) => {
         const byYear = aggregatesByBedroomAndYear.get(bedroomCount)
         const cells = calendarYears.map((calendarYear) => {
            const aggregate = byYear.get(calendarYear)
            if (!aggregate || aggregate.count === 0) return null
            return {
               averageRent:
                  Math.round((aggregate.sum / aggregate.count) * 100) / 100,
               count: aggregate.count,
            }
         })
         let listingsTotalForBedroom = 0
         byYear.forEach((aggregate) => {
            listingsTotalForBedroom += aggregate.count
         })
         return {
            bedrooms: bedroomCount,
            cells,
            listings: listingsTotalForBedroom,
         }
      })

   return { years: calendarYears, rows }
}

/**
 * Aggregate registry payload into tables, scatter series, and metadata for the dashboard API.
 *
 * @param {object} registryResponse Shape from rentalregistry.ca (see `models/data.json`)
 */
function averageRentByBedrooms(registryResponse) {
   const housingsList = registryResponse?.data?.housings
   if (!Array.isArray(housingsList)) {
      throw {
         type: `CUSTOM`,
         name: `Registry data`,
         message: `Invalid registry response (no housing list).`,
      }
   }

   const filteredListings = housingsList.filter(listingPassesRentAnalysisFilters)

   const { yearMin, yearMax } = getRentAnalysisYearWindow()
   const filteredCondo = filteredListings.filter(listingHasApartmentNumber)
   const filteredPlex = filteredListings.filter(
      (listing) => !listingHasApartmentNumber(listing),
   )

   const bedroomsYearTable = buildBedroomsYearTable(
      filteredListings,
      yearMin,
      yearMax,
   )
   const bedroomsYearTablePlex = buildBedroomsYearTable(
      filteredPlex,
      yearMin,
      yearMax,
   )
   const bedroomsYearTableCondo = buildBedroomsYearTable(
      filteredCondo,
      yearMin,
      yearMax,
   )
   const { condo, plexTownhouse } = rentScatterPointsSplit(housingsList)

   return {
      bedroomsYearTable,
      bedroomsYearTablePlex,
      bedroomsYearTableCondo,
      totalListings: filteredListings.length,
      totalListingsInArea: housingsList.length,
      scatterPointsCondo: condo,
      scatterPointsPlexTownhouse: plexTownhouse,
      filters: {
         maxRentMonthly: RENT_ANALYSIS_MAX_RENT_MONTHLY,
         yearMin,
         yearMax,
      },
   }
}

/**
 * @param {object} registryResponse API response from rental registry
 */
function processData(registryResponse) {
   return averageRentByBedrooms(registryResponse)
}

module.exports = {
   processData,
   averageRentByBedrooms,
   buildBedroomsYearTable,
   rentScatterPointsSplit,
   listingPassesRentAnalysisFilters,
   listingHasApartmentNumber,
}
