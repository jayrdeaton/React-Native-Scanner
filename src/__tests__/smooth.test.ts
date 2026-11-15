import { smoother } from '../smooth'

const FRAME = 1 / 30

describe('smoother', () => {
  it('starts at its first reading', () => {
    const smooth = smoother({ beta: 0.03, minCutoff: 1 })
    expect(smooth(42, FRAME)).toBe(42)
  })

  it('keeps its value for a reading no time after the last', () => {
    const smooth = smoother({ beta: 0.03, minCutoff: 1 })
    smooth(0, FRAME)
    expect(smooth(100, 0)).toBe(0)
  })

  it('smooths away the wobble of a value that holds still', () => {
    const smooth = smoother({ beta: 0.03, minCutoff: 1 })
    const out = Array.from({ length: 60 }, (_, i) => smooth(i % 2 === 0 ? 0 : 4, FRAME)).slice(-20)
    expect(Math.max(...out) - Math.min(...out)).toBeLessThan(1)
    expect(out.at(-1)).toBeCloseTo(2, 0)
  })

  it('follows a value moving fast closely', () => {
    const smooth = smoother({ beta: 0.03, minCutoff: 1 })
    let out = 0
    for (let i = 0; i < 20; i++) out = smooth(30 * i, FRAME)
    expect(30 * 19 - out).toBeLessThan(10)
  })

  it('smooths a fast-moving value harder the lower its beta', () => {
    const lag = (beta: number) => {
      const smooth = smoother({ beta, minCutoff: 1 })
      let out = 0
      for (let i = 0; i < 20; i++) out = smooth(30 * i, FRAME)
      return 30 * 19 - out
    }
    expect(lag(0.01)).toBeGreaterThan(lag(0.03))
  })
})
