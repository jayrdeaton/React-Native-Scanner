import { buildDisabledScanValueSet } from '../buildDisabledScanValueSet'

describe('buildDisabledScanValueSet', () => {
  it('collects a single string value per item', () => {
    const items = [{ data: 'a' }, { data: 'b' }, { data: 'c' }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.data })
    expect(result).toEqual(new Set(['a', 'b', 'c']))
  })

  it('collects multiple values per item from an array-returning getValues', () => {
    const items = [{ values: ['a', 'b'] }, { values: ['c'] }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.values })
    expect(result).toEqual(new Set(['a', 'b', 'c']))
  })

  it('filters out falsy values returned by getValues', () => {
    const items = [{ value: 'a' }, { value: '' }, { value: null }, { value: undefined }, { value: 'b' }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.value })
    expect(result).toEqual(new Set(['a', 'b']))
  })

  it('dedupes values across different items, keeping first occurrence order', () => {
    const items = [{ data: 'a' }, { data: 'b' }, { data: 'a' }, { data: 'c' }, { data: 'b' }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.data })
    expect(Array.from(result)).toEqual(['a', 'b', 'c'])
  })

  it('stops collecting once the limit is reached, preserving priority order', () => {
    const items = [{ data: 'a' }, { data: 'b' }, { data: 'c' }, { data: 'd' }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.data, limit: 2 })
    expect(Array.from(result)).toEqual(['a', 'b'])
  })

  it('stops mid-item once the limit is reached within a single multi-value getValues result', () => {
    const items = [{ values: ['a', 'b', 'c'] }, { values: ['d'] }]
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.values, limit: 2 })
    expect(Array.from(result)).toEqual(['a', 'b'])
  })

  it('collects everything unbounded when limit is omitted', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ data: `value-${i}` }))
    const result = buildDisabledScanValueSet(items, { getValues: (item) => item.data })
    expect(result.size).toBe(200)
  })
})
