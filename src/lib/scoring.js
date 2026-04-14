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
const LABOUR_HOURS = {
  Small:  { Low: 40,  Medium: 60,  High: 90  },
  Medium: { Low: 80,  Medium: 120, High: 160 },
  Large:  { Low: 120, Medium: 160, High: 200 },
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

// Bid ranges: [min, max] per size bucket
const BID_RANGES = {
  Small:  { min: 6000,  max: 7000  },
  Medium: { min: 7000,  max: 8500  },
  Large:  { min: 8500,  max: 12000 },
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
