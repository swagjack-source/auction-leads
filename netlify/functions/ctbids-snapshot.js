// CTBids Live Auction Snapshot
// POST /api/ctbids-snapshot  { url: string }
// Proxies the CTBids internal API with the correct origin/referer headers.
// Responses are cached in-memory for 25 s to avoid hammering CTBids when
// multiple users watch the same auction.

const DETAIL_ENDPOINT = 'https://sale.ctbids.com/services/api/v1/search/sale/detail'

// Fields we request from CTBids
const SALE_FIELDS = [
  'id', 'title', 'city', 'state', 'zipcode',
  'starttime', 'endtime', 'itemcount', 'status',
  'timezoneid', 'timezonename', 'provenance',
  'contactmobile', 'contactemail',
]

// Headers the browser sends — required to avoid 403
const PROXY_HEADERS = {
  'accept':       'application/json, text/plain, */*',
  'content-type': 'application/json',
  'origin':       'https://ctbids.com',
  'referer':      'https://ctbids.com/',
  'user-agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

// Simple in-process cache (TTL 25 s)
const CACHE = new Map() // saleId → { ts, data }
const CACHE_TTL = 25_000

function extractSaleId(rawUrl) {
  try {
    const u = new URL(rawUrl)
    if (!u.hostname.includes('ctbids.com')) return null
    const m = u.pathname.match(/\/estate-sale\/(\d+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

function ok(body) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } }
  }
  if (event.httpMethod !== 'POST') {
    return ok({ available: false, error: 'Method not allowed' })
  }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return ok({ available: false, error: 'Invalid JSON body' }) }

  const saleId = extractSaleId(body.url || '')
  if (!saleId) {
    return ok({ available: false, error: 'Provide a valid ctbids.com/estate-sale/ID URL' })
  }

  // Return cached hit
  const hit = CACHE.get(saleId)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return ok(hit.data)

  try {
    const res = await fetch(`${DETAIL_ENDPOINT}/${saleId}`, {
      method:  'POST',
      headers: PROXY_HEADERS,
      body:    JSON.stringify({
        sort:  [{ field: 'id', direction: 'asc' }],
        field: SALE_FIELDS,
      }),
    })

    if (!res.ok) {
      const data = { available: false, error: `CTBids API returned ${res.status}` }
      return ok(data)
    }

    const json = await res.json()
    const sale = json?.data?.[0]

    if (!sale) {
      return ok({ available: false, error: 'Sale not found or auction has ended' })
    }

    const data = {
      available:    true,
      sale_id:      String(sale.id),
      title:        sale.title || `Sale #${sale.id}`,
      status:       sale.status,          // "Started" | "Ended" | "Preview" etc.
      start_time:   sale.starttime,       // "2026-05-25 16:30:00"
      end_time:     sale.endtime,         // "2026-06-01 18:30:00"
      timezone:     sale.timezonename,    // "US/Eastern"
      timezone_id:  sale.timezoneid,
      item_count:   sale.itemcount ?? null,
      city:         sale.city,
      state:        sale.state,
      source_url:   body.url,
      fetched_at:   new Date().toISOString(),
    }

    CACHE.set(saleId, { ts: Date.now(), data })
    return ok(data)

  } catch (e) {
    return ok({ available: false, error: e.message || 'Failed to reach CTBids' })
  }
}
