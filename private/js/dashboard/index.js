/**
 * Dashboard — submit address → POST /api/rental-analysis → tables + rent bubble charts.
 * Analysis thresholds and chart styling come from `config/rentalAnalysis.js` (bundled).
 */

const rentalAnalysis = require(`../../../config/rentalAnalysis`)
const { POST } = require(`../components/rest`)
const {
   displayErrors,
   clearErrorMessages,
} = require(`../components/errorHandling`)
const {
   setButtonLoadingState,
   restoreButtonFromLoadingState,
} = require(`../components/buttonLoadingState`)

require(`../components/mainNavBar`)

const $submit = $(`#analyzeSubmit`)
const $street = $(`#street`)
const $city = $(`#city`)
const $postalCode = $(`#postalCode`)
const $scale = $(`#scale`)
const $results = $(`#resultsSection`)
const $geocodeLine = $(`#geocodeLine`)
const $warningsBox = $(`#warningsBox`)
const $plexTableHead = $(`#plexTableHead`)
const $plexTableBody = $(`#plexTableBody`)
const $condoTableHead = $(`#condoTableHead`)
const $condoTableBody = $(`#condoTableBody`)
const $averagesTableHead = $(`#averagesTableHead`)
const $averagesTableBody = $(`#averagesTableBody`)
const $totalsLine = $(`#totalsLine`)
const $scatterSection = $(`#scatterChartSection`)
const $scatterFiltersLine = $(`#scatterFiltersLine`)
const $scatterEmptyPlex = $(`#scatterChartEmptyPlex`)
const $scatterEmptyCondo = $(`#scatterChartEmptyCondo`)
const $rentBedroomToggleWrapPlex = $(`#rentBedroomToggleWrapPlex`)
const $rentBedroomToggleWrapCondo = $(`#rentBedroomToggleWrapCondo`)

/** Active Chart.js instances keyed by segment (`plex` | `condo`). */
const scatterChartsBySegment = { plex: null, condo: null }

/**
 * Per-chart bedroom filter: `selected` is click-pinned (exclusive); `hover` previews while pointer is over a button.
 *
 * @type {Record<'plex'|'condo', { selected: number|null, hover: number|null }>}
 */
const bedroomFilterState = {
   plex: { selected: null, hover: null },
   condo: { selected: null, hover: null },
}

const formatMoney = (amount) =>
   new Intl.NumberFormat(`en-CA`, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
   }).format(amount)

/**
 * Aggregate raw listings into one bubble per (calendar year × bedroom colour × rent band).
 *
 * @param {Array<{ year: number, rent: number, bedrooms: number }>} scatterPoints
 */
function buildRentBubbleDatasets(scatterPoints) {
   const dollarBand = rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE
   /** One Map per bedroom colour: key `${year}|${rentFloor}` → `{ count, sumRent }`. */
   const seriesByBedroom = Array.from(
      { length: rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT },
      () => new Map(),
   )

   for (const point of scatterPoints) {
      const bedroomIdx = rentalAnalysis.chartBedroomBucketIndex(point.bedrooms)
      if (
         bedroomIdx < 0 ||
         bedroomIdx >= rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT
      ) {
         continue
      }
      const rentFloor = rentalAnalysis.rentChartDollarBucketFloor(point.rent)
      const key = `${point.year}|${rentFloor}`
      const map = seriesByBedroom[bedroomIdx]
      const agg = map.get(key) ?? { count: 0, sumRent: 0 }
      agg.count += 1
      agg.sumRent += point.rent
      map.set(key, agg)
   }

   return rentalAnalysis.SCATTER_ROOM_LABELS.map((label, bedroomIdx) => {
      const map = seriesByBedroom[bedroomIdx]
      const data = []
      for (const [key, agg] of map) {
         const [yearStr, floorStr] = key.split(`|`)
         const year = Number(yearStr)
         const rentBucketFloor = Number(floorStr)
         const yCenter = rentBucketFloor + dollarBand / 2
         data.push({
            x: year + rentalAnalysis.chartBedroomStackXOffset(bedroomIdx),
            y: yCenter,
            r: rentalAnalysis.chartBubbleRadiusPx(agg.count),
            year,
            rentBucketFloor,
            rentBucketCeilingExclusive: rentBucketFloor + dollarBand,
            count: agg.count,
            averageRent: agg.sumRent / agg.count,
         })
      }
      return {
         label,
         data,
         /** Used by bedroom toggle UI — maps to button index `0..7` (7 = 7+). */
         bedroomBucketIndex: bedroomIdx,
         backgroundColor:
            bedroomIdx === rentalAnalysis.CHART_BEDROOM_BUCKET_COUNT - 1
               ? rentalAnalysis.SCATTER_ROOM_COLOR_7_PLUS
               : rentalAnalysis.SCATTER_ROOM_COLORS[bedroomIdx],
      }
   }).filter((dataset) => dataset.data.length > 0)
}

/**
 * @param {{ yearMin: number, yearMax: number }} yearBoundsInclusive Calendar years shown on the x-axis
 */
function scatterChartOptions(yearBoundsInclusive) {
   const { yearMin, yearMax } = yearBoundsInclusive
   const pad = rentalAnalysis.CHART_YEAR_AXIS_PAD

   return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
         padding: { ...rentalAnalysis.CHART_LAYOUT_PADDING },
      },
      scales: {
         x: {
            type: `linear`,
            min: yearMin - pad,
            max: yearMax + pad,
            title: { display: true, text: `Year` },
            ticks: {
               stepSize: 1,
               precision: 0,
               autoSkip: false,
               maxTicksLimit: rentalAnalysis.CHART_X_AXIS_MAX_TICKS,
               maxRotation: 0,
               callback(tickValue) {
                  const numeric =
                     typeof tickValue === `number` ? tickValue : Number(tickValue)
                  const rounded = Math.round(numeric)
                  if (!Number.isFinite(rounded)) return ``
                  if (Math.abs(numeric - rounded) > 1e-6) return ``
                  if (rounded < yearMin || rounded > yearMax) return ``
                  return String(rounded)
               },
            },
         },
         y: {
            title: { display: true, text: `Rent ($ / month)` },
            ticks: {
               callback: (value) => formatMoney(value),
            },
         },
      },
      plugins: {
         legend: {
            position: `bottom`,
            labels: { boxWidth: 12 },
            /** Avoid toggling datasets via legend — bedroom buttons own visibility. */
            onClick: null,
         },
         tooltip: {
            callbacks: {
               label: (context) => {
                  const raw = context.raw
                  if (!raw || typeof raw.x !== `number` || typeof raw.y !== `number`) {
                     return context.dataset.label || ``
                  }
                  const calendarYear =
                     typeof raw.year === `number` ? raw.year : Math.round(raw.x)
                  const rentHi =
                     typeof raw.rentBucketCeilingExclusive === `number`
                        ? raw.rentBucketCeilingExclusive - 1
                        : raw.y
                  const rentLo =
                     typeof raw.rentBucketFloor === `number`
                        ? raw.rentBucketFloor
                        : raw.y
                  const count = typeof raw.count === `number` ? raw.count : 1
                  const avgRent =
                     typeof raw.averageRent === `number`
                        ? raw.averageRent
                        : raw.y
                  const bucketPart = `$${formatMoney(rentLo)}–$${formatMoney(rentHi)}`
                  const listingsWord = count === 1 ? `listing` : `listings`
                  return `${context.dataset.label}: ${calendarYear}, ${bucketPart}, ${count} ${listingsWord}, avg $${formatMoney(avgRent)}`
               },
            },
         },
      },
   }
}

function resetBedroomFilterUi() {
   for (const seg of [`plex`, `condo`]) {
      bedroomFilterState[seg] = { selected: null, hover: null }
      const $wrap =
         seg === `plex` ? $rentBedroomToggleWrapPlex : $rentBedroomToggleWrapCondo
      $wrap
         .find(`.rent-bedroom-btn`)
         .removeClass(`active`)
         .prop(`disabled`, false)
   }
}

/**
 * @param {object|null} chart Chart.js instance
 * @param {JQuery} $wrap
 */
function syncBedroomToggleButtonsDisabled(chart, $wrap) {
   if (!chart) {
      $wrap.find(`.rent-bedroom-btn`).prop(`disabled`, true)
      return
   }
   const present = new Set(
      chart.data.datasets.map((ds) => ds.bedroomBucketIndex),
   )
   $wrap.find(`.rent-bedroom-btn`).each(function () {
      const b = Number($(this).data(`bedroom`))
      $(this).prop(`disabled`, !present.has(b))
   })
}

/**
 * @param {object|null} chart Chart.js instance
 * @param {'plex'|'condo'} segment
 */
function applyBedroomVisibility(chart, segment) {
   if (!chart) return
   const { selected, hover } = bedroomFilterState[segment]
   const effective = hover !== null ? hover : selected
   chart.data.datasets.forEach((_ds, datasetIndex) => {
      const ds = chart.data.datasets[datasetIndex]
      const visible =
         effective === null || ds.bedroomBucketIndex === effective
      chart.setDatasetVisibility(datasetIndex, visible)
   })
   chart.update()
}

/**
 * @param {'plex'|'condo'} segment
 */
function syncBedroomToggleButtonActive(segment) {
   const $wrap =
      segment === `plex` ? $rentBedroomToggleWrapPlex : $rentBedroomToggleWrapCondo
   const selected = bedroomFilterState[segment].selected
   $wrap.find(`.rent-bedroom-btn`).each(function () {
      const b = Number($(this).data(`bedroom`))
      $(this).toggleClass(`active`, selected === b)
   })
}

/**
 * @param {'plex'|'condo'} segment
 */
function applyBedroomFilter(segment) {
   applyBedroomVisibility(scatterChartsBySegment[segment], segment)
   syncBedroomToggleButtonActive(segment)
}

function destroyScatterCharts() {
   for (const segmentKey of Object.keys(scatterChartsBySegment)) {
      const chartInstance = scatterChartsBySegment[segmentKey]
      if (chartInstance) {
         chartInstance.destroy()
         scatterChartsBySegment[segmentKey] = null
      }
   }
   resetBedroomFilterUi()
}

$scatterSection.on(`click`, `.rent-bedroom-btn`, function (e) {
   const $btn = $(e.currentTarget)
   if ($btn.prop(`disabled`)) return
   const segment = $btn.closest(`[data-segment]`).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   const bedroom = Number($btn.data(`bedroom`))
   const state = bedroomFilterState[segment]
   if (state.selected === bedroom) {
      state.selected = null
   } else {
      state.selected = bedroom
   }
   applyBedroomFilter(segment)
})

$scatterSection.on(`mouseenter`, `.rent-bedroom-btn`, function (e) {
   const $btn = $(e.currentTarget)
   if ($btn.prop(`disabled`)) return
   const segment = $btn.closest(`[data-segment]`).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   bedroomFilterState[segment].hover = Number($btn.data(`bedroom`))
   applyBedroomVisibility(scatterChartsBySegment[segment], segment)
})

$scatterSection.on(`mouseleave`, `.rent-bedroom-toggle`, function (e) {
   const segment = $(e.currentTarget).data(`segment`)
   if (segment !== `plex` && segment !== `condo`) return
   bedroomFilterState[segment].hover = null
   applyBedroomFilter(segment)
})

/**
 * @param {string} canvasElementId
 * @param {Array<{ year: number, rent: number, bedrooms: number }>} scatterPoints
 * @param {{ yearMin: number, yearMax: number }} yearBoundsInclusive
 */
function createScatterChartOnCanvas(
   canvasElementId,
   scatterPoints,
   yearBoundsInclusive,
) {
   const ChartConstructor = typeof Chart !== `undefined` ? Chart : null
   const canvas = document.getElementById(canvasElementId)
   if (!canvas || !ChartConstructor || !scatterPoints?.length) return null

   const datasets = buildRentBubbleDatasets(scatterPoints)
   if (datasets.length === 0) return null

   return new ChartConstructor(canvas, {
      type: `bubble`,
      data: { datasets },
      options: scatterChartOptions(yearBoundsInclusive),
   })
}

/**
 * @param {object} summary API `data.summary`
 */
function renderRentScatterCharts(summary) {
   destroyScatterCharts()

   const ChartConstructor = typeof Chart !== `undefined` ? Chart : null
   if (!ChartConstructor) {
      $scatterSection.addClass(`d-none`)
      return
   }

   const condoPoints = summary?.scatterPointsCondo ?? []
   const plexPoints = summary?.scatterPointsPlexTownhouse ?? []
   const filters = summary?.filters

   const fallbackWindow = rentalAnalysis.getRentAnalysisYearWindow()
   const yearBoundsInclusive =
      filters?.yearMin != null && filters?.yearMax != null
         ? { yearMin: filters.yearMin, yearMax: filters.yearMax }
         : fallbackWindow

   if (filters) {
      $scatterFiltersLine.text(
         `Filters: rent ≤ $${formatMoney(filters.maxRentMonthly)} / month, years ${filters.yearMin}–${filters.yearMax}. Rent is grouped into $${rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE} buckets on the vertical axis; bubble area reflects how many listings fall in each bucket.`,
      )
   } else {
      $scatterFiltersLine.text(
         `Years ${yearBoundsInclusive.yearMin}–${yearBoundsInclusive.yearMax}; rent in $${rentalAnalysis.RENT_CHART_DOLLAR_BUCKET_SIZE} bands; bubbles shifted slightly by bedroom count so stacks don’t overlap.`,
      )
   }

   $scatterSection.removeClass(`d-none`)

   scatterChartsBySegment.plex = createScatterChartOnCanvas(
      `rentScatterChartPlex`,
      plexPoints,
      yearBoundsInclusive,
   )
   scatterChartsBySegment.condo = createScatterChartOnCanvas(
      `rentScatterChartCondo`,
      condoPoints,
      yearBoundsInclusive,
   )

   if (scatterChartsBySegment.plex) $scatterEmptyPlex.addClass(`d-none`)
   else $scatterEmptyPlex.removeClass(`d-none`)

   if (scatterChartsBySegment.condo) $scatterEmptyCondo.addClass(`d-none`)
   else $scatterEmptyCondo.removeClass(`d-none`)

   syncBedroomToggleButtonsDisabled(
      scatterChartsBySegment.plex,
      $rentBedroomToggleWrapPlex,
   )
   syncBedroomToggleButtonsDisabled(
      scatterChartsBySegment.condo,
      $rentBedroomToggleWrapCondo,
   )
   applyBedroomVisibility(scatterChartsBySegment.plex, `plex`)
   applyBedroomVisibility(scatterChartsBySegment.condo, `condo`)
   syncBedroomToggleButtonActive(`plex`)
   syncBedroomToggleButtonActive(`condo`)

   $rentBedroomToggleWrapPlex.toggleClass(`d-none`, !scatterChartsBySegment.plex)
   $rentBedroomToggleWrapCondo.toggleClass(
      `d-none`,
      !scatterChartsBySegment.condo,
   )
}

/**
 * @param {{ averageRent: number, count: number }|null} cell
 */
function formatRentCellInnerHtml(cell) {
   if (cell == null) return `—`
   return `<span class="rent-cell"><span class="rent-cell__avg">$${formatMoney(cell.averageRent)}</span><span class="rent-cell__count">(${cell.count})</span></span>`
}

/**
 * @param {JQuery} $head
 * @param {JQuery} $body
 * @param {object|null|undefined} bedroomsYearTable `{ years, rows }`
 */
function renderRentYearTable($head, $body, bedroomsYearTable) {
   $head.empty()
   $body.empty()

   const calendarYears = bedroomsYearTable?.years ?? []
   const bodyRows = bedroomsYearTable?.rows ?? []

   if (calendarYears.length === 0) {
      $body.append(
         `<tr><td class="text-center text-muted">No year range available.</td></tr>`,
      )
      return
   }

   const yearColumnCount = calendarYears.length

   const headRow1 = `<tr>
      <th rowspan="2" scope="col" class="align-middle">Bedrooms</th>
      <th scope="colgroup" colspan="${yearColumnCount}" class="text-center">Average rent ($ / month)</th>
      <th rowspan="2" scope="col" class="align-middle">Listings</th>
   </tr>`
   const yearHeaderCells = calendarYears
      .map((calendarYear) => `<th scope="col">${calendarYear}</th>`)
      .join(``)
   const headRow2 = `<tr>${yearHeaderCells}</tr>`

   $head.append(headRow1)
   $head.append(headRow2)

   if (bodyRows.length === 0) {
      $body.append(
         `<tr><td colspan="${1 + yearColumnCount + 1}" class="text-center text-muted">No valid listings in the area for averages.</td></tr>`,
      )
      return
   }

   for (const row of bodyRows) {
      const rowClassAttribute =
         row.bedrooms >= rentalAnalysis.RENT_TABLE_MANY_BEDROOMS_THRESHOLD
            ? ` class="rent-table-row--five-plus-bedrooms"`
            : ``
      const dataCells = calendarYears
         .map((_calendarYear, yearColumnIndex) => {
            const innerHtml = formatRentCellInnerHtml(row.cells[yearColumnIndex])
            return `<td class="text-end">${innerHtml}</td>`
         })
         .join(``)
      $body.append(
         `<tr${rowClassAttribute}><th scope="row">${row.bedrooms}</th>${dataCells}<td class="text-end">${row.listings}</td></tr>`,
      )
   }
}

/**
 * @param {object} summary API `data.summary`
 */
function renderAllRentTables(summary) {
   renderRentYearTable($plexTableHead, $plexTableBody, summary?.bedroomsYearTablePlex)
   renderRentYearTable($condoTableHead, $condoTableBody, summary?.bedroomsYearTableCondo)
   renderRentYearTable(
      $averagesTableHead,
      $averagesTableBody,
      summary?.bedroomsYearTable,
   )
}

$submit.on(`click`, async () => {
   clearErrorMessages()

   const payload = {
      street: $street.val().trim(),
      city: $city.val().trim(),
      postalCode: $postalCode.val().trim(),
      scale: rentalAnalysis.clampRegistryBboxScale($scale.val()),
   }

   setButtonLoadingState($submit, `Analyzing…`)

   try {
      const data = await POST(`/api/rental-analysis`, payload, { goToRedirect: false })

      const { geocode, summary } = data
      $geocodeLine.text(
         geocode?.formatted_address
            ? `Matched address: ${geocode.formatted_address}`
            : `Coordinates: ${geocode.lat?.toFixed?.(5)}, ${geocode.lng?.toFixed?.(5)}`,
      )

      const warnings = geocode?.warnings
      if (Array.isArray(warnings) && warnings.length > 0) {
         $warningsBox.removeClass(`d-none`).text(warnings.join(` `))
      } else {
         $warningsBox.addClass(`d-none`).text(``)
      }

      renderAllRentTables(summary)

      const retainedCount = summary?.totalListings ?? 0
      const rawInBboxCount = summary?.totalListingsInArea
      let totalsMessage = `Listings used (rent / year filters): ${retainedCount}.`
      if (typeof rawInBboxCount === `number` && rawInBboxCount !== retainedCount) {
         totalsMessage += ` Raw total in bbox: ${rawInBboxCount}.`
      }
      $totalsLine.text(totalsMessage)

      renderRentScatterCharts(summary)

      $results.removeClass(`d-none`)
   } catch (err) {
      displayErrors(err)
      destroyScatterCharts()
      $results.addClass(`d-none`)
   } finally {
      restoreButtonFromLoadingState($submit)
   }
})
