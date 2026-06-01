function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function auctionEvents(startStr) {
  return [
    { event_type: 'Sort & Organize', start_date: startStr,              end_date: null },
    { event_type: 'Lotting',         start_date: addDays(startStr, 1),  end_date: addDays(startStr, 3) },
    { event_type: 'Auction Post',    start_date: addDays(startStr, 4),  end_date: null },
    { event_type: 'Auction Run',     start_date: addDays(startStr, 4),  end_date: addDays(startStr, 9) },
    { event_type: 'Pickup Prep',     start_date: addDays(startStr, 10), end_date: null },
    { event_type: 'Auction Pickup',  start_date: addDays(startStr, 11), end_date: null },
  ]
}

function cleanoutEvents(startStr) {
  return [
    { event_type: 'Clean Out', start_date: startStr, end_date: addDays(startStr, 1) },
  ]
}

// Returns an array of { event_type, start_date, end_date } objects.
// Returns [] for job types with no template (Move, In-person Estate Sale, etc.).
export function suggestTimeline(jobType, startDateStr) {
  if (!startDateStr) return []
  if (jobType === 'Auction')   return auctionEvents(startDateStr)
  if (jobType === 'Clean Out') return cleanoutEvents(startDateStr)
  if (jobType === 'Both') {
    const cleanout = cleanoutEvents(startDateStr)
    return [...cleanout, ...auctionEvents(addDays(startDateStr, 2))]
  }
  return []
}
