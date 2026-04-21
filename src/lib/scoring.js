/**
 * Deal Scoring Engine
 * All logic is transparent and adjustable here as real data comes in.
 */

// Size buckets based on square footage
export function getSizeBucket(sqft) {
  if (sqft < 1500) return 'Small'
  if (sqft < 3500) return 'Medium'
  return 'Large'
}

// Labour hour estimates by size × density
// Calibrated from real project data (Denver/Aurora area, 2025–2026)
// One confirmed data point: medium home ~68 hrs at $22/hr = $1,504 labour
const LABOUR_HOURS = {
  Small:  { Low: 20,  Medium: 40,  High: 65  },
  Medium: { Low: 50,  Medium: 80,  High: 120 },
  Large:  { Low: 100, Medium: 140, High: 190 },
}

export function estimateLabourHours(sqft, density) {
  const size = getSizeBucket(sqft)
  const base = LABOUR_HOURS[size][density]

  // Scale slightly within bucket based on exact sqft
  const bucketMin = { Small: 0,    Medium: 1500, Large: 3500 }
  const bucketMax = { Small: 1500, Medium: 3500, Large: 6000 }
  const min = bucketMin[size]
  const max = bucketMax[size]
  const ratio = Math.min((sqft - min) / (max - min), 1)

  // Increase by up to 20% within bucket
  return Math.round(base * (1 + ratio * 0.2))
}

const HOURLY_RATE = 22
const OVERHEAD_PCT = 0.20
export const ROYALTY_PCT = 0.07  // CT franchise royalty (7% of gross revenue)

// Bid ranges for Clean Out base, by property size
// Calibrated from 51 real Cedar Operations jobs (2025–2026):
//   Small  → garages, studios, small apts:  $500–$4,000
//   Medium → standard 2–3 bed homes:        $4,000–$8,500
//   Large  → large homes / estates:         $8,000–$15,000
const BID_RANGES = {
  Small:  { min: 1500, max: 4000  },
  Medium: { min: 4000, max: 8500  },
  Large:  { min: 8500, max: 15000 },
}

// For Auction-only jobs, bid is lower (no labour-intensive cleanout)
const AUCTION_DISCOUNT = 0.75

export function calculateDeal({ sqft, density, itemQuality, jobType, zipCode }) {
  const size = getSizeBucket(sqft)
  const labourHours = estimateLabourHours(sqft, density)
  const labourCost = labourHours * HOURLY_RATE
  const overheadCost = labourCost * OVERHEAD_PCT
  const totalCost = labourCost + overheadCost

  // Recommended bid
  const range = BID_RANGES[size]
  const densityMultiplier = { Low: 0, Medium: 0.5, High: 1 }[density]
  const rawBid = range.min + (range.max - range.min) * densityMultiplier

  let recommendedBid = rawBid
  if (jobType === 'Auction') recommendedBid = rawBid * AUCTION_DISCOUNT
  if (jobType === 'Both') recommendedBid = rawBid * 1.15  // premium for full-service

  // Item quality affects auction revenue potential:
  // quality 1 = 0.75x, quality 5 ≈ 0.97x, quality 7 ≈ 1.08x, quality 10 = 1.25x
  const qualityFactor = 0.75 + (itemQuality - 1) * (0.5 / 9)
  if (jobType === 'Auction') {
    recommendedBid = recommendedBid * qualityFactor
  } else if (jobType === 'Both') {
    // Auction portion (~half the value) is quality-sensitive
    recommendedBid = recommendedBid * (0.5 + qualityFactor * 0.5)
  }
  // Clean Out: quality doesn't affect the service fee

  recommendedBid = Math.round(recommendedBid / 100) * 100  // round to nearest $100

  const estimatedProfit = recommendedBid - totalCost
  const profitMarginPct = (estimatedProfit / recommendedBid) * 100

  // ---- Deal Score (out of 10) ----
  // Weighted components — adjust weights as real data comes in

  // 1. Size score (bigger = more revenue potential): 0–10
  const sizeScore = Math.min(sqft / 500, 10)

  // 2. Density score (more stuff = more auction items): High=9, Medium=6, Low=3
  const densityScore = { Low: 3, Medium: 6, High: 9 }[density]

  // 3. Item quality score: already 0–10
  const qualityScore = itemQuality

  // 4. Profit score: 0–10 based on margin percentage
  const profitScore = Math.min(Math.max((profitMarginPct / 40) * 10, 0), 10)

  // 5. Job type bonus: Both = max upside
  const jobTypeScore = { 'Clean Out': 6, 'Auction': 7, 'Both': 10 }[jobType]

  // Weights (must sum to 1.0)
  const WEIGHTS = {
    size:     0.20,
    density:  0.15,
    quality:  0.30,
    profit:   0.25,
    jobType:  0.10,
  }

  const dealScore = (
    sizeScore   * WEIGHTS.size +
    densityScore * WEIGHTS.density +
    qualityScore * WEIGHTS.quality +
    profitScore  * WEIGHTS.profit +
    jobTypeScore * WEIGHTS.jobType
  )

  const finalScore = Math.round(dealScore * 10) / 10

  return {
    size,
    labourHours,
    labourCost: Math.round(labourCost),
    overheadCost: Math.round(overheadCost),
    totalCost: Math.round(totalCost),
    recommendedBid,
    estimatedProfit: Math.round(estimatedProfit),
    profitMarginPct: Math.round(profitMarginPct * 10) / 10,
    dealScore: finalScore,
    scoreBreakdown: {
      size:     { raw: Math.round(sizeScore * 10) / 10,    weight: WEIGHTS.size,    weighted: Math.round(sizeScore * WEIGHTS.size * 10) / 10 },
      density:  { raw: densityScore,                        weight: WEIGHTS.density, weighted: Math.round(densityScore * WEIGHTS.density * 10) / 10 },
      quality:  { raw: qualityScore,                        weight: WEIGHTS.quality, weighted: Math.round(qualityScore * WEIGHTS.quality * 10) / 10 },
      profit:   { raw: Math.round(profitScore * 10) / 10,  weight: WEIGHTS.profit,  weighted: Math.round(profitScore * WEIGHTS.profit * 10) / 10 },
      jobType:  { raw: jobTypeScore,                        weight: WEIGHTS.jobType, weighted: Math.round(jobTypeScore * WEIGHTS.jobType * 10) / 10 },
    },
  }
}

// ── Crew & scheduling estimates ───────────────────────────────

// Estimated crew size needed based on job parameters.
// Override with real data via lead.crew_size once you have it.
export function estimateCrew(sqft, density, jobType) {
  if (!sqft || !density || !jobType) return 2
  const size = getSizeBucket(Number(sqft))
  let crew = { Small: 2, Medium: 3, Large: 5 }[size]
  if (density === 'High')   crew += 1
  if (jobType === 'Auction') crew += 1
  if (jobType === 'Both')    crew += 1
  return crew
}

// Estimated project duration in calendar days given a crew size.
export function estimateProjectDays(sqft, density, jobType, crewSize) {
  if (!sqft || !density || !jobType) return 1
  const hours = estimateLabourHours(Number(sqft), density)
  const adjusted = jobType === 'Both' ? hours * 1.4
                 : jobType === 'Auction' ? hours * 1.2
                 : hours
  const crew = crewSize || estimateCrew(sqft, density, jobType)
  return Math.max(1, Math.ceil(adjusted / (crew * 8)))
}

export function getScoreColor(score) {
  if (score >= 7.5) return '#22c55e'
  if (score >= 5)   return '#f59e0b'
  return '#ef4444'
}

export function getScoreLabel(score) {
  if (score >= 8)   return 'Excellent'
  if (score >= 6.5) return 'Good'
  if (score >= 5)   return 'Fair'
  return 'Poor'
}
