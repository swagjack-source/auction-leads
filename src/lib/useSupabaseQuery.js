import { useState, useEffect, useCallback } from 'react'
import logger from './logger'

/**
 * useSupabaseQuery
 *
 * Manages loading / error / data state for any async Supabase fetch.
 *
 * @param {() => Promise<any>} queryFn
 *   Async function that performs the fetch and RETURNS the result data
 *   (or throws on error). Supabase errors are not thrown by default —
 *   callers should check the `error` field and throw if needed:
 *
 *     const { data, loading, error, refetch } = useSupabaseQuery(async () => {
 *       const { data, error } = await supabase.from('contacts').select('*')
 *       if (error) throw error
 *       return data ?? []
 *     })
 *
 * @param {any[]} deps
 *   Re-runs the query whenever any value in this array changes (like useEffect).
 *   Pass [] (default) to run only on mount.
 *
 * @param {{ errorMessage?: string, enabled?: boolean }} options
 *   errorMessage — human-readable fallback shown to the user on failure.
 *   enabled      — set to false to skip the fetch (useful for conditional queries).
 *
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: () => void, mutate: (updater: any) => void }}
 *   mutate — directly update cached data for optimistic UI updates.
 *   Accepts a value or an updater function: mutate(prev => ({ ...prev, foo: 1 }))
 */
export function useSupabaseQuery(queryFn, deps = [], options = {}) {
  const {
    errorMessage = 'Failed to load data. Please try again.',
    enabled = true,
  } = options

  const [data,    setData]    = useState(undefined)
  const [loading, setLoading] = useState(enabled)
  const [error,   setError]   = useState(null)

  // Stable identity across renders unless deps change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      setData(result)
    } catch (err) {
      logger.error('useSupabaseQuery error', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [enabled, errorMessage, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, mutate: setData }
}
