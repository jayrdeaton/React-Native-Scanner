export type BuildDisabledScanValueSetOptions<T> = {
  getValues: (item: T) => Iterable<string | null | undefined> | string | null | undefined
  limit?: number
}

export const buildDisabledScanValueSet = <T>(items: Iterable<T>, { getValues, limit = Number.POSITIVE_INFINITY }: BuildDisabledScanValueSetOptions<T>): Set<string> => {
  const values = new Set<string>()
  for (const item of items) {
    const raw = getValues(item)
    const candidates = typeof raw === 'string' ? [raw] : raw ? Array.from(raw) : []
    for (const value of candidates) {
      if (!value || values.has(value)) continue
      values.add(value)
      if (values.size >= limit) return values
    }
  }
  return values
}
