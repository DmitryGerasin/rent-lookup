/**
 * Rental registry analysis: filtering rules, registry search box size, and rent-analysis chart styling.
 *
 * This module uses only plain values and pure helpers (no `process.env`) so it can be
 * required from browserified client bundles as well as Node.
 */

/** Drop listings above this monthly rent when building tables and charts (outliers / bad data). */
const RENT_ANALYSIS_MAX_RENT_MONTHLY = 4250

/**
 * How many calendar years **before** the reference year are included in the window (inclusive).
 * Example: reference 2026 and value 4 → earliest year 2022.
 */
const RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE = 4

/**
 * How many calendar years **after** the reference year are included (inclusive).
 * `0` means data ends at the reference year (typically “current calendar year” on the server).
 */
const RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE = 0

/** Minimum edge length (meters) of the square bbox sent to the registry API (see `getHousings`). */
const REGISTRY_SEARCH_BOX_EDGE_METERS_MIN = 50

/** Maximum edge length (meters) of the square bbox sent to the registry API. */
const REGISTRY_SEARCH_BOX_EDGE_METERS_MAX = 2000

/** Default square edge length when the client omits or sends an invalid value. */
const REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT = 350

/** Slider / POST body step for search box edge length (meters). */
const REGISTRY_SEARCH_BOX_EDGE_METERS_STEP = 10

/**
 * Bedroom counts **greater than or equal to** this value use muted row styling on rent-analysis tables.
 */
const RENT_TABLE_MANY_BEDROOMS_THRESHOLD = 5

/**
 * Rent chart: listings are grouped into vertical bands of this width ($/month).
 * One bubble is drawn per (calendar year × bedroom colour × rent band).
 */
const RENT_CHART_DOLLAR_BUCKET_SIZE = 100

/** Minimum bubble radius (px) when a bucket has only one listing. */
const CHART_BUBBLE_RADIUS_MIN_PX = 4

/** Maximum bubble radius (px); caps very large buckets so the chart stays readable. */
const CHART_BUBBLE_RADIUS_MAX_PX = 34

/**
 * Bubble radius grows with √(listing count) × this factor (plus {@link CHART_BUBBLE_RADIUS_MIN_PX}).
 * Sqrt scaling keeps area growth perceptually closer to “more mass = more listings”.
 */
const CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX = 2.75

/** Horizontal separation of bedroom stacks on the scatter x-axis, in “year” axis units. */
const CHART_BEDROOM_STACK_SPREAD = 0.95

/**
 * Extra padding below the first and above the last calendar year on the chart x-axis
 * so edge stacks and tick labels are not clipped.
 */
const CHART_YEAR_AXIS_PAD = 0.85

/** Scatter point size (px). */
const CHART_POINT_RADIUS = 4

/** Scatter point size on hover (px). */
const CHART_POINT_HOVER_RADIUS = 6

/** Chart.js `layout.padding` around the plot area. */
const CHART_LAYOUT_PADDING = { left: 4, right: 12, top: 4, bottom: 6 }

/** Upper bound for x-axis ticks (years shown are derived from data window; this avoids Chart.js auto-skip hiding ticks). */
const CHART_X_AXIS_MAX_TICKS = 24

/** Rainbow order: red = 0 bedrooms … violet = 6; `SCATTER_ROOM_COLOR_7_PLUS` = 7+. */
const SCATTER_ROOM_COLORS = [
   `#d32f2f`,
   `#f57c00`,
   `#fbc02d`,
   `#388e3c`,
   `#1976d2`,
   `#3949ab`,
   `#8e24aa`,
]

const SCATTER_ROOM_COLOR_7_PLUS = `#4a148c`

const SCATTER_ROOM_LABELS = [
   `0 bedrooms`,
   `1 bedroom`,
   `2 bedrooms`,
   `3 bedrooms`,
   `4 bedrooms`,
   `5 bedrooms`,
   `6 bedrooms`,
   `7+ bedrooms`,
]

/**
 * Bedroom buckets for colour coding: indices 0–6 = exact bedroom counts, index 7 = 7+ merged.
 * Must match `SCATTER_ROOM_LABELS.length`.
 */
const CHART_BEDROOM_BUCKET_COUNT = SCATTER_ROOM_LABELS.length

/**
 * Inclusive calendar-year bounds used for filtering listings and for table columns.
 *
 * @param {number} [referenceCalendarYear] Usually `new Date().getFullYear()` on the server when processing a request.
 * @returns {{ yearMin: number, yearMax: number }}
 */
function getRentAnalysisYearWindow(referenceCalendarYear = new Date().getFullYear()) {
   return {
      yearMin:
         referenceCalendarYear - RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE,
      yearMax:
         referenceCalendarYear + RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE,
   }
}

/**
 * Clamp and quantize square bbox edge length from client input (meters).
 *
 * @param {unknown} rawValue From `req.body.boxEdgeMeters` or equivalent.
 * @returns {number}
 */
function clampRegistrySearchBoxEdgeMeters(rawValue) {
   let meters = Number(rawValue)
   if (!Number.isFinite(meters)) {
      meters = REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT
   }
   meters =
      Math.round(meters / REGISTRY_SEARCH_BOX_EDGE_METERS_STEP) *
      REGISTRY_SEARCH_BOX_EDGE_METERS_STEP
   return Math.min(
      REGISTRY_SEARCH_BOX_EDGE_METERS_MAX,
      Math.max(REGISTRY_SEARCH_BOX_EDGE_METERS_MIN, meters),
   )
}

/**
 * Map a bedroom count to a chart bucket index in `0 .. CHART_BEDROOM_BUCKET_COUNT - 1`.
 *
 * @param {number} closedBedroomCount From listing `number_of_closed_room`.
 */
function chartBedroomBucketIndex(closedBedroomCount) {
   return closedBedroomCount >= (CHART_BEDROOM_BUCKET_COUNT - 1)
      ? (CHART_BEDROOM_BUCKET_COUNT - 1)
      : closedBedroomCount
}

/**
 * X-axis offset for a bucket so stacks for the same calendar year do not overlap.
 *
 * @param {number} bucketIndex `0..7` from {@link chartBedroomBucketIndex}.
 */
function chartBedroomStackXOffset(bucketIndex) {
   const normalized = bucketIndex / (CHART_BEDROOM_BUCKET_COUNT - 1) - 0.5
   return normalized * CHART_BEDROOM_STACK_SPREAD
}

/**
 * Lower bound of the rent bucket containing `monthlyRent` (inclusive), in dollars.
 *
 * @param {number} monthlyRent
 */
function rentChartDollarBucketFloor(monthlyRent) {
   return (
      Math.floor(monthlyRent / RENT_CHART_DOLLAR_BUCKET_SIZE) *
      RENT_CHART_DOLLAR_BUCKET_SIZE
   )
}

/**
 * Vertical chart position: centre of the rent bucket band (so dots align to $50 steps).
 *
 * @param {number} monthlyRent
 */
function rentChartDollarBucketCenterY(monthlyRent) {
   return (
      rentChartDollarBucketFloor(monthlyRent) + RENT_CHART_DOLLAR_BUCKET_SIZE / 2
   )
}

/**
 * Bubble radius in pixels from the number of listings aggregated into one bucket.
 *
 * @param {number} listingCount Must be ≥ 1
 */
function chartBubbleRadiusPx(listingCount) {
   const scaled =
      CHART_BUBBLE_RADIUS_MIN_PX +
      Math.sqrt(listingCount) * CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX
   return Math.min(
      CHART_BUBBLE_RADIUS_MAX_PX,
      Math.max(CHART_BUBBLE_RADIUS_MIN_PX, scaled),
   )
}

module.exports = {
   RENT_ANALYSIS_MAX_RENT_MONTHLY,
   RENT_ANALYSIS_YEAR_RANGE_YEARS_BEFORE_REFERENCE,
   RENT_ANALYSIS_YEAR_RANGE_YEARS_AFTER_REFERENCE,
   REGISTRY_SEARCH_BOX_EDGE_METERS_MIN,
   REGISTRY_SEARCH_BOX_EDGE_METERS_MAX,
   REGISTRY_SEARCH_BOX_EDGE_METERS_DEFAULT,
   REGISTRY_SEARCH_BOX_EDGE_METERS_STEP,
   RENT_TABLE_MANY_BEDROOMS_THRESHOLD,
   RENT_CHART_DOLLAR_BUCKET_SIZE,
   CHART_BUBBLE_RADIUS_MIN_PX,
   CHART_BUBBLE_RADIUS_MAX_PX,
   CHART_BUBBLE_RADIUS_SQRT_MULTIPLIER_PX,
   CHART_BEDROOM_STACK_SPREAD,
   CHART_YEAR_AXIS_PAD,
   CHART_POINT_RADIUS,
   CHART_POINT_HOVER_RADIUS,
   CHART_LAYOUT_PADDING,
   CHART_X_AXIS_MAX_TICKS,
   CHART_BEDROOM_BUCKET_COUNT,
   SCATTER_ROOM_COLORS,
   SCATTER_ROOM_COLOR_7_PLUS,
   SCATTER_ROOM_LABELS,
   getRentAnalysisYearWindow,
   clampRegistrySearchBoxEdgeMeters,
   chartBedroomBucketIndex,
   chartBedroomStackXOffset,
   rentChartDollarBucketFloor,
   rentChartDollarBucketCenterY,
   chartBubbleRadiusPx,
}
