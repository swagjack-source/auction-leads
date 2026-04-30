import { describe, it, expect } from 'vitest'
import {
  getSizeBucket,
  estimateLabourHours,
  calculateDeal,
  estimateCrew,
  estimateProjectDays,
  getScoreColor,
  getScoreLabel,
} from './scoring'

// ── getSizeBucket ─────────────────────────────────────────────
describe('getSizeBucket', () => {
  it('returns Small for sqft < 1500', () => {
    expect(getSizeBucket(500)).toBe('Small')
    expect(getSizeBucket(1499)).toBe('Small')
  })

  it('returns Medium for 1500–3499', () => {
    expect(getSizeBucket(1500)).toBe('Medium')
    expect(getSizeBucket(3499)).toBe('Medium')
  })

  it('returns Large for sqft >= 3500', () => {
    expect(getSizeBucket(3500)).toBe('Large')
    expect(getSizeBucket(8000)).toBe('Large')
  })
})

// ── estimateLabourHours ────────────────────────────────────────
describe('estimateLabourHours', () => {
  it('returns base hours for small/low at bucket minimum', () => {
    // LABOUR_HOURS.Small.Low = 16 (calibrated from CT Denver SE real job data, 2025-2026)
    // At sqft=0 ratio is 0, so base * 1.0 = 16
    const hours = estimateLabourHours(0, 'Low')
    expect(hours).toBe(16)
  })

  it('returns ~20% more at top of bucket', () => {
    // At sqft=1499 (near top of Small), should be close to 16 * 1.2 = 19.2 → 19
    const hours = estimateLabourHours(1499, 'Low')
    expect(hours).toBeGreaterThan(17)
    expect(hours).toBeLessThanOrEqual(20)
  })

  it('returns higher hours for higher density', () => {
    const low = estimateLabourHours(2000, 'Low')
    const med = estimateLabourHours(2000, 'Medium')
    const high = estimateLabourHours(2000, 'High')
    expect(low).toBeLessThan(med)
    expect(med).toBeLessThan(high)
  })

  it('clamps ratio at 1 beyond bucket max', () => {
    const hoursNormal = estimateLabourHours(6000, 'Medium')
    const hoursBeyond = estimateLabourHours(10000, 'Medium')
    // Both should yield same result (clamped at bucket max)
    expect(hoursNormal).toBe(hoursBeyond)
  })
})

// ── calculateDeal ──────────────────────────────────────────────
describe('calculateDeal', () => {
  const base = { sqft: 2000, density: 'Medium', itemQuality: 7, jobType: 'Clean Out' }

  it('returns all expected fields', () => {
    const result = calculateDeal(base)
    expect(result).toHaveProperty('size')
    expect(result).toHaveProperty('labourHours')
    expect(result).toHaveProperty('labourCost')
    expect(result).toHaveProperty('overheadCost')
    expect(result).toHaveProperty('totalCost')
    expect(result).toHaveProperty('recommendedBid')
    expect(result).toHaveProperty('estimatedProfit')
    expect(result).toHaveProperty('profitMarginPct')
    expect(result).toHaveProperty('dealScore')
    expect(result).toHaveProperty('scoreBreakdown')
  })

  it('correctly calculates size for medium property', () => {
    const result = calculateDeal(base)
    expect(result.size).toBe('Medium')
  })

  it('overhead is 15% of labour cost', () => {
    // Phase 5: lowered to 0.15. Big fixed costs (dumpsters) are baked into
    // the cleanout bid range itself, so overhead now only covers small
    // consumables / fuel.
    const result = calculateDeal(base)
    expect(result.overheadCost).toBe(Math.round(result.labourCost * 0.15))
  })

  it('totalCost = labourCost + overheadCost', () => {
    const result = calculateDeal(base)
    expect(result.totalCost).toBe(result.labourCost + result.overheadCost)
  })

  it('recommendedBid is rounded to nearest $100', () => {
    const result = calculateDeal(base)
    expect(result.recommendedBid % 100).toBe(0)
  })

  it('Auction job type reduces bid vs Clean Out', () => {
    const cleanOut = calculateDeal({ ...base, jobType: 'Clean Out' })
    const auction  = calculateDeal({ ...base, jobType: 'Auction' })
    expect(auction.recommendedBid).toBeLessThan(cleanOut.recommendedBid)
  })

  it('Both job type yields highest bid', () => {
    const cleanOut = calculateDeal({ ...base, jobType: 'Clean Out' })
    const both     = calculateDeal({ ...base, jobType: 'Both' })
    expect(both.recommendedBid).toBeGreaterThan(cleanOut.recommendedBid)
  })

  it('higher item quality increases Auction bid', () => {
    const lowQ  = calculateDeal({ ...base, jobType: 'Auction', itemQuality: 2 })
    const highQ = calculateDeal({ ...base, jobType: 'Auction', itemQuality: 9 })
    expect(highQ.recommendedBid).toBeGreaterThan(lowQ.recommendedBid)
  })

  it('item quality does NOT affect Clean Out bid', () => {
    const lowQ  = calculateDeal({ ...base, jobType: 'Clean Out', itemQuality: 1 })
    const highQ = calculateDeal({ ...base, jobType: 'Clean Out', itemQuality: 10 })
    expect(lowQ.recommendedBid).toBe(highQ.recommendedBid)
  })

  it('dealScore is within 0–10 range', () => {
    const result = calculateDeal(base)
    expect(result.dealScore).toBeGreaterThanOrEqual(0)
    expect(result.dealScore).toBeLessThanOrEqual(10)
  })

  it('score weights sum to 1.0', () => {
    const result = calculateDeal(base)
    const { scoreBreakdown: s } = result
    const totalWeight = s.size.weight + s.density.weight + s.quality.weight + s.profit.weight + s.jobType.weight
    expect(totalWeight).toBeCloseTo(1.0)
  })

  it('larger property produces higher deal score than tiny one (same conditions)', () => {
    const small = calculateDeal({ ...base, sqft: 500 })
    const large = calculateDeal({ ...base, sqft: 5000 })
    expect(large.dealScore).toBeGreaterThan(small.dealScore)
  })

  it('High density produces higher score than Low', () => {
    const low  = calculateDeal({ ...base, density: 'Low' })
    const high = calculateDeal({ ...base, density: 'High' })
    expect(high.dealScore).toBeGreaterThan(low.dealScore)
  })

  it('estimatedProfit = recommendedBid - totalCost', () => {
    const result = calculateDeal(base)
    expect(result.estimatedProfit).toBe(Math.round(result.recommendedBid - result.labourCost - result.overheadCost))
  })

  it('profitMarginPct is within 0–100', () => {
    const result = calculateDeal(base)
    expect(result.profitMarginPct).toBeGreaterThanOrEqual(0)
    expect(result.profitMarginPct).toBeLessThanOrEqual(100)
  })
})

// ── estimateCrew ───────────────────────────────────────────────
describe('estimateCrew', () => {
  it('returns 2 for missing params', () => {
    expect(estimateCrew(null, null, null)).toBe(2)
  })

  it('returns more crew for Large than Small', () => {
    const small = estimateCrew(800, 'Medium', 'Clean Out')
    const large = estimateCrew(5000, 'Medium', 'Clean Out')
    expect(large).toBeGreaterThan(small)
  })

  it('adds crew for High density', () => {
    const low  = estimateCrew(2000, 'Low', 'Clean Out')
    const high = estimateCrew(2000, 'High', 'Clean Out')
    expect(high).toBeGreaterThan(low)
  })

  it('adds crew for Auction job type', () => {
    const cleanOut = estimateCrew(2000, 'Medium', 'Clean Out')
    const auction  = estimateCrew(2000, 'Medium', 'Auction')
    expect(auction).toBeGreaterThan(cleanOut)
  })

  it('Both job type adds crew too', () => {
    const cleanOut = estimateCrew(2000, 'Medium', 'Clean Out')
    const both     = estimateCrew(2000, 'Medium', 'Both')
    expect(both).toBeGreaterThan(cleanOut)
  })
})

// ── estimateProjectDays ────────────────────────────────────────
describe('estimateProjectDays', () => {
  it('returns 1 for missing params', () => {
    expect(estimateProjectDays(null, null, null, null)).toBe(1)
  })

  it('returns at least 1 day', () => {
    const days = estimateProjectDays(500, 'Low', 'Clean Out', 10)
    expect(days).toBeGreaterThanOrEqual(1)
  })

  it('Auction takes longer than Clean Out', () => {
    const cleanOut = estimateProjectDays(3000, 'Medium', 'Clean Out', 3)
    const auction  = estimateProjectDays(3000, 'Medium', 'Auction', 3)
    expect(auction).toBeGreaterThanOrEqual(cleanOut)
  })

  it('Both takes longest', () => {
    const cleanOut = estimateProjectDays(3000, 'Medium', 'Clean Out', 3)
    const both     = estimateProjectDays(3000, 'Medium', 'Both', 3)
    expect(both).toBeGreaterThan(cleanOut)
  })

  it('larger crew reduces days', () => {
    const small = estimateProjectDays(3000, 'Medium', 'Clean Out', 2)
    const large = estimateProjectDays(3000, 'Medium', 'Clean Out', 8)
    expect(large).toBeLessThan(small)
  })
})

// ── getScoreColor ──────────────────────────────────────────────
describe('getScoreColor', () => {
  it('returns green for score >= 7.5', () => {
    expect(getScoreColor(7.5)).toBe('#22c55e')
    expect(getScoreColor(10)).toBe('#22c55e')
  })

  it('returns yellow/amber for score 5–7.4', () => {
    expect(getScoreColor(5)).toBe('#f59e0b')
    expect(getScoreColor(7.4)).toBe('#f59e0b')
  })

  it('returns red for score < 5', () => {
    expect(getScoreColor(4.9)).toBe('#ef4444')
    expect(getScoreColor(0)).toBe('#ef4444')
  })
})

// ── getScoreLabel ──────────────────────────────────────────────
describe('getScoreLabel', () => {
  it('returns Excellent for score >= 8', () => {
    expect(getScoreLabel(8)).toBe('Excellent')
    expect(getScoreLabel(10)).toBe('Excellent')
  })

  it('returns Good for 6.5–7.9', () => {
    expect(getScoreLabel(6.5)).toBe('Good')
    expect(getScoreLabel(7.9)).toBe('Good')
  })

  it('returns Fair for 5–6.4', () => {
    expect(getScoreLabel(5)).toBe('Fair')
    expect(getScoreLabel(6.4)).toBe('Fair')
  })

  it('returns Poor for score < 5', () => {
    expect(getScoreLabel(4.9)).toBe('Poor')
    expect(getScoreLabel(0)).toBe('Poor')
  })
})
