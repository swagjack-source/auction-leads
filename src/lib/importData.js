import { supabase } from './supabase'

function parseNum(val) {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function parseDate(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.toISOString().split('T')[0]
  }
  const s = String(val).trim()
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

function parseint(val) {
  const n = parseInt(String(val ?? '').replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

// Build a normalized lookup map from a row so column matching is
// case-insensitive and whitespace-tolerant
function makeGetter(row) {
  const norm = {}
  for (const key of Object.keys(row)) {
    norm[key.trim().toLowerCase()] = key
  }
  return (name) => row[norm[name.trim().toLowerCase()]]
}

export async function importCategories(rows) {
  const detectedHeaders = rows.length ? Object.keys(rows[0]) : []
  const records = rows
    .map(r => { const g = makeGetter(r); return g('category') ? { _name: String(g('category')).trim(), _g: g } : null })
    .filter(Boolean)
    .map(({ _name, _g: g }) => ({
      name:          _name,
      items_sold:    parseint(g('items sold')),
      total_revenue: parseNum(g('total revenue')),
      avg_price:     parseNum(g('avg price')),
      median_price:  parseNum(g('median price')),
      max_price:     parseNum(g('max price')),
      avg_bids:      parseNum(g('avg bids')),
      avg_views:     parseNum(g('avg views')),
    }))

  if (!records.length) return { success: true, count: 0, detectedHeaders }
  const { error } = await supabase.from('ctbids_categories').upsert(records, { onConflict: 'name' })
  if (error) return { success: false, error: error.message, detectedHeaders }
  return { success: true, count: records.length, detectedHeaders }
}

export async function importAuctions(rows) {
  const detectedHeaders = rows.length ? Object.keys(rows[0]) : []
  const records = rows
    .map(r => { const g = makeGetter(r); return g('auction title') ? { _title: String(g('auction title')).trim(), _g: g } : null })
    .filter(Boolean)
    .map(({ _title, _g: g }) => ({
      title:          _title,
      start_date:     parseDate(g('start date')),
      end_date:       parseDate(g('end date')),
      items_sold:     parseint(g('items sold')),
      total_revenue:  parseNum(g('total revenue')),
      buyers_premium: parseNum(g('buyers premium')),
      avg_price:      parseNum(g('avg price')),
      pickup_count:   parseint(g('pickup count')),
      shipping_count: parseint(g('shipping count')),
    }))

  if (!records.length) return { success: true, count: 0, detectedHeaders }
  const { error } = await supabase.from('ctbids_auctions').upsert(records, { onConflict: 'title' })
  if (error) return { success: false, error: error.message, detectedHeaders }
  return { success: true, count: records.length, detectedHeaders }
}

export async function importItems(rows) {
  const detectedHeaders = rows.length ? Object.keys(rows[0]) : []
  const records = rows
    .map(r => { const g = makeGetter(r); return g('item name') ? { _name: String(g('item name')).trim(), _g: g } : null })
    .filter(r => {
      if (!r) return false
      const n = r._name.toUpperCase()
      if (n.includes('DO NOT POST') || n.includes('REMOVE')) return false
      const price = parseNum(r._g('sale price'))
      if (!price || price <= 0) return false
      return true
    })
    .map(({ _name, _g: g }) => {
      const method = String(g('method') ?? g('receipt method') ?? '').trim().toLowerCase()
      const status = String(g('status') ?? '').trim()
      return {
        item_name:      _name,
        category:       g('category') ? String(g('category')).trim() : null,
        sku:            g('sku') ? String(g('sku')).trim() : null,
        sale_price:     parseNum(g('sale price')),
        buyers_premium: parseNum(g('buyers premium')),
        tax:            parseNum(g('tax')),
        bids:           parseint(g('bids')),
        views:          parseint(g('views')),
        receipt_method: method === 'pickup' ? 'pickup' : method === 'shipping' ? 'shipping' : null,
        status:         ['Sold','Pending','Not Sold'].includes(status) ? status : null,
        auction_title:  g('auction title') ? String(g('auction title')).trim() : null,
        end_date:       parseDate(g('end date')),
      }
    })

  if (!records.length) return { success: true, count: 0, detectedHeaders }
  const { error: delErr } = await supabase.from('ctbids_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) return { success: false, error: delErr.message, detectedHeaders }
  const { error } = await supabase.from('ctbids_items').insert(records)
  if (error) return { success: false, error: error.message, detectedHeaders }
  return { success: true, count: records.length, detectedHeaders }
}

export async function importPastProjects(rows) {
  const detectedHeaders = rows.length ? Object.keys(rows[0]) : []
  const records = rows
    .map(r => { const g = makeGetter(r); return g('client name') ? { _name: String(g('client name')).trim(), _g: g } : null })
    .filter(Boolean)
    .map(({ _name, _g: g }) => ({
      client_name:     _name,
      address:         g('address') ? String(g('address')).trim().slice(0, 500) : null,
      month:           g('month') ? String(g('month')).trim() : null,
      year:            parseint(g('year')),
      job_type:        g('job type') ? String(g('job type')).trim() : null,
      // try both dash variants for the cost range columns
      cost_range_low:  parseNum(g('scope — cost range low') ?? g('scope - cost range low') ?? g('cost range low')),
      cost_range_high: parseNum(g('scope — cost range high') ?? g('scope - cost range high') ?? g('cost range high')),
      deposit:         parseNum(g('deposit')),
      invoiced_total:  parseNum(g('services total (invoiced)') ?? g('invoiced total') ?? g('services total')),
      auction_revenue: parseNum(g('auction revenue')),
      buyers_premium:  parseNum(g('buyers premium')),
      labor_cost:      parseNum(g('labour cost') ?? g('labor cost')),
      expenses:        parseNum(g('expenses')),
      royalties:       parseNum(g('royalties')),
      net_profit:      parseNum(g('net profit')),
      bid_accuracy:    ['Underbid','Good Bid','Overbid'].includes(String(g('bid accuracy') ?? '').trim())
                         ? String(g('bid accuracy')).trim() : null,
    }))

  if (!records.length) return { success: true, count: 0, detectedHeaders }
  const { error: delErr } = await supabase.from('past_projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) return { success: false, error: delErr.message, detectedHeaders }
  const { error } = await supabase.from('past_projects').insert(records)
  if (error) return { success: false, error: error.message, detectedHeaders }
  return { success: true, count: records.length, detectedHeaders }
}
