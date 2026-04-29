/**
 * CTBids Live Auction Scraper
 * Scrapes https://ctbids.com/estate-sales/Denver-Southeast-CO
 * and writes active lot data to the `ctbids_live` Supabase table.
 *
 * Run modes:
 *   node index.js           → starts cron (runs every 30 min)
 *   node index.js --debug   → single run, saves screenshot + DOM dump, verbose logging
 *   node index.js --once    → single run, no cron
 */

const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')

// ── Config ────────────────────────────────────────────────────

const CTBIDS_URL   = process.env.CTBIDS_URL || 'https://ctbids.com/estate-sales/Denver-Southeast-CO'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY  // use service role key — bypasses RLS
const DEBUG_MODE   = process.argv.includes('--debug')
const ONCE_MODE    = process.argv.includes('--once') || DEBUG_MODE
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * *'  // every 30 minutes

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

// ── Browser launch options ────────────────────────────────────

function getBrowserArgs() {
  return [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--window-size=1280,900',
  ]
}

// ── DOM extraction (runs inside the browser page context) ────

async function extractLotsFromPage(page, saleUrl) {
  log(`Extracting lots from: ${saleUrl}`)
  await page.goto(saleUrl, { waitUntil: 'networkidle2', timeout: 45_000 })

  // Give React/JS extra time to fully render after network idle
  await new Promise(r => setTimeout(r, 3000))

  if (DEBUG_MODE) {
    const debugDir = path.join(__dirname, 'debug')
    fs.mkdirSync(debugDir, { recursive: true })
    const slug = saleUrl.replace(/[^a-z0-9]/gi, '_').slice(-40)
    await page.screenshot({ path: path.join(debugDir, `${slug}.png`), fullPage: true })
    const html = await page.content()
    fs.writeFileSync(path.join(debugDir, `${slug}.html`), html)
    log(`DEBUG: screenshot + HTML saved to ./debug/${slug}.*`)
  }

  const result = await page.evaluate(() => {
    // ── Selector strategy ──────────────────────────────────
    // CTBids renders lots as cards. We try several selector patterns
    // in order of specificity. If none match, we return debug info
    // so you can inspect the actual DOM structure.

    function tryText(el, ...selectors) {
      for (const s of selectors) {
        const found = el.querySelector(s)
        if (found && found.textContent.trim()) return found.textContent.trim()
      }
      return null
    }

    function tryAttr(el, attr, ...selectors) {
      for (const s of selectors) {
        const found = el.querySelector(s)
        if (found && found.getAttribute(attr)) return found.getAttribute(attr)
      }
      return null
    }

    function parsePrice(str) {
      if (!str) return 0
      return parseFloat(str.replace(/[^0-9.]/g, '')) || 0
    }

    function parseCount(str) {
      if (!str) return 0
      return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0
    }

    // Try to find lot card container elements
    // These selectors are guesses — update based on debug output if needed
    const CARD_SELECTORS = [
      '[class*="lot-card"]',
      '[class*="LotCard"]',
      '[class*="lot_card"]',
      '[data-lot-id]',
      '[data-testid*="lot"]',
      '[class*="auction-item"]',
      '[class*="AuctionItem"]',
      '[class*="item-card"]',
      '[class*="ItemCard"]',
      // Fallback: any article or li that contains a price
      'article',
      'li[class*="lot"]',
    ]

    let cards = []
    let matchedSelector = null
    for (const sel of CARD_SELECTORS) {
      const found = document.querySelectorAll(sel)
      if (found.length > 0) {
        // Quick sanity check: at least one card should have some price-like text
        const hasPrice = Array.from(found).some(el => /\$[\d,]+/.test(el.textContent))
        if (hasPrice) {
          cards = Array.from(found)
          matchedSelector = sel
          break
        }
      }
    }

    if (cards.length === 0) {
      // Nothing found — return debug info
      return {
        debug: true,
        url: window.location.href,
        title: document.title,
        bodyPreview: document.body.innerText.slice(0, 2000),
        // List all class names used on the page to help identify selectors
        classNames: [...new Set(
          Array.from(document.querySelectorAll('[class]'))
            .map(el => el.className.split(/\s+/).filter(c => c.length > 3 && c.length < 50))
            .flat()
        )].slice(0, 100),
      }
    }

    // Extract lot data from each card
    const lots = cards.map((card, idx) => {
      // Lot number — try data attr first, then text containing '#' or 'Lot'
      const lotNumEl = card.querySelector('[class*="lot-number"], [class*="lotNumber"], [class*="lot_number"]')
      const lotNum = (
        card.dataset.lotId
        || card.dataset.lot
        || lotNumEl?.textContent?.trim()
        || `#${idx + 1}`
      )

      // Title
      const title = tryText(card,
        '[class*="title"]',
        '[class*="name"]',
        '[class*="description"]',
        'h2', 'h3', 'h4',
        'p[class*="title"]',
      ) || 'Unknown item'

      // Current bid / price
      const bidText = tryText(card,
        '[class*="current-bid"]',
        '[class*="currentBid"]',
        '[class*="current_bid"]',
        '[class*="bid-amount"]',
        '[class*="bidAmount"]',
        '[class*="price"]',
        '[class*="amount"]',
      )
      const currentBid = parsePrice(bidText)

      // Bid count
      const bidCountText = tryText(card,
        '[class*="bid-count"]',
        '[class*="bidCount"]',
        '[class*="num-bids"]',
        '[class*="bids"]',
      )
      const bidCount = parseCount(bidCountText)

      // End time — look for datetime attr or ISO string in data attributes
      const endsAt = (
        card.dataset.endsAt
        || card.dataset.endTime
        || card.dataset.endDate
        || card.querySelector('time')?.getAttribute('datetime')
        || tryAttr(card, 'datetime', 'time')
        || null
      )

      // Image
      const imgEl = card.querySelector('img')
      const imageUrl = imgEl?.src || null

      // Auction/sale ID from URL or data attr
      const auctionId = card.dataset.auctionId || card.dataset.saleId || null

      return {
        lot_number: String(lotNum).trim(),
        title: title.slice(0, 500),
        current_bid: currentBid,
        bid_count: bidCount,
        ends_at: endsAt,
        status: 'active',
        auction_id: auctionId,
        image_url: imageUrl,
        sale_url: window.location.href,
        scraped_at: new Date().toISOString(),
        _matched_selector: matchedSelector,
      }
    })

    return { lots, matchedSelector, count: lots.length }
  })

  return result
}

// ── Find active sales on the seller landing page ──────────────

async function findActiveSales(page) {
  log(`Loading seller page: ${CTBIDS_URL}`)
  await page.goto(CTBIDS_URL, { waitUntil: 'networkidle2', timeout: 45_000 })
  await new Promise(r => setTimeout(r, 3000))

  if (DEBUG_MODE) {
    const debugDir = path.join(__dirname, 'debug')
    fs.mkdirSync(debugDir, { recursive: true })
    await page.screenshot({ path: path.join(debugDir, 'landing.png'), fullPage: true })
    fs.writeFileSync(path.join(debugDir, 'landing.html'), await page.content())
    log('DEBUG: landing page screenshot + HTML saved to ./debug/landing.*')
  }

  const result = await page.evaluate(() => {
    // Look for sale cards / links on the landing page
    const SALE_SELECTORS = [
      'a[href*="/estate-sale/"]',
      'a[href*="/auction/"]',
      'a[href*="/sale/"]',
      '[class*="sale-card"] a',
      '[class*="SaleCard"] a',
      '[class*="event-card"] a',
      '[class*="auction-card"] a',
    ]

    const links = []
    for (const sel of SALE_SELECTORS) {
      const found = document.querySelectorAll(sel)
      if (found.length > 0) {
        found.forEach(a => {
          const href = a.href
          if (href && !links.includes(href)) links.push(href)
        })
        break
      }
    }

    return {
      links,
      title: document.title,
      url: window.location.href,
      bodyPreview: document.body.innerText.slice(0, 1000),
    }
  })

  if (DEBUG_MODE) {
    log('DEBUG landing page:', JSON.stringify(result, null, 2))
  }

  return result
}

// ── Write to Supabase ─────────────────────────────────────────

async function writeToSupabase(lots) {
  if (lots.length === 0) {
    // No active lots — clear the table
    log('No active lots found — clearing ctbids_live table')
    const { error } = await supabase.from('ctbids_live').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) log('Warning: could not clear ctbids_live:', error.message)
    return
  }

  // Remove internal debug fields before upserting
  const rows = lots.map(({ _matched_selector, ...lot }) => lot)

  // Upsert — conflict on lot_number so re-runs update prices rather than duplicate
  const { error, data } = await supabase
    .from('ctbids_live')
    .upsert(rows, { onConflict: 'lot_number' })

  if (error) {
    log('❌  Supabase upsert error:', error.message)
    if (error.code === '42P01') {
      log('   → Table "ctbids_live" does not exist. Run the SQL in ctbids_schema.sql first.')
    }
  } else {
    log(`✅  Upserted ${rows.length} lots to ctbids_live`)
  }

  // Remove lots from previous scrape that are no longer in the current list
  // (i.e. ended/sold since last run)
  const activeLotNumbers = rows.map(r => r.lot_number)
  const { error: delError } = await supabase
    .from('ctbids_live')
    .delete()
    .not('lot_number', 'in', `(${activeLotNumbers.map(n => `"${n}"`).join(',')})`)

  if (delError) log('Warning: could not remove stale lots:', delError.message)
}

// ── Main scrape function ──────────────────────────────────────

async function scrape() {
  log('─'.repeat(60))
  log(`Starting CTBids scrape  [debug=${DEBUG_MODE}]`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: getBrowserArgs(),
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width: 1280, height: 900 })

    // ── Step 1: Check the landing page for active sales ──────
    const landing = await findActiveSales(page)

    if (DEBUG_MODE) {
      log(`Landing page title: "${landing.title}"`)
      log(`Found ${landing.links.length} sale link(s):`, landing.links)
    }

    let allLots = []

    if (landing.links.length === 0) {
      // The landing page might directly list lots, or there are no active sales.
      // Try extracting lots directly from the landing URL.
      log('No separate sale links found — attempting to extract lots from landing page directly')
      const result = await extractLotsFromPage(page, CTBIDS_URL)

      if (result.debug) {
        log('⚠️  Could not find lot cards on the page.')
        log('   Page title:', result.title)
        log('   URL:', result.url)
        log('   Body preview:', result.bodyPreview)
        if (DEBUG_MODE) {
          log('   Class names found:', result.classNames.join(', '))
        }
        log('')
        log('   ── What this means ──────────────────────────────────')
        log('   Either there are no active sales right now, or the')
        log('   CSS selectors in this scraper need updating.')
        log('   See ./debug/landing.* for the full screenshot + HTML.')
        log('   Share that HTML with the developer to update selectors.')
        log('   ─────────────────────────────────────────────────────')
        await writeToSupabase([])
        return
      }

      if (result.lots) {
        log(`Extracted ${result.lots.length} lots using selector: "${result.matchedSelector}"`)
        allLots = result.lots
      }
    } else {
      // ── Step 2: Visit each active sale page and extract lots ─
      for (const saleUrl of landing.links) {
        const result = await extractLotsFromPage(page, saleUrl)

        if (result.debug) {
          log(`⚠️  No lots found at ${saleUrl}`)
          if (DEBUG_MODE) {
            log('   Body preview:', result.bodyPreview)
            log('   Classes:', result.classNames?.join(', '))
          }
          continue
        }

        if (result.lots?.length > 0) {
          log(`  Found ${result.lots.length} lots at ${saleUrl} (selector: "${result.matchedSelector}")`)
          allLots = allLots.concat(result.lots)
        }
      }
    }

    log(`Total lots collected: ${allLots.length}`)

    if (DEBUG_MODE && allLots.length > 0) {
      log('Sample lot:', JSON.stringify(allLots[0], null, 2))
    }

    await writeToSupabase(allLots)

  } catch (err) {
    log('❌  Scrape error:', err.message)
    if (DEBUG_MODE) console.error(err)
  } finally {
    await browser.close()
    log('Browser closed')
  }
}

// ── Entry point ───────────────────────────────────────────────

if (ONCE_MODE) {
  // Run once and exit (used for --debug and --once flags)
  scrape().then(() => {
    log('Done.')
    process.exit(0)
  }).catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
} else {
  // Run immediately on start, then on cron schedule
  log(`CTBids scraper starting. Schedule: "${CRON_SCHEDULE}"`)
  scrape()
  cron.schedule(CRON_SCHEDULE, scrape)
}
