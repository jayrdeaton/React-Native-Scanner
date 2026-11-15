import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { Animated } from 'react-native'

import type { BarcodeScanResult } from '../types'
import { useScanOverlays } from '../useScanOverlays'

const scan = (data: string, extra?: Partial<BarcodeScanResult>): BarcodeScanResult => ({
  data,
  type: 'qr',
  bounds: { origin: { x: 1, y: 2 }, size: { width: 3, height: 4 } },
  ...extra
})

// handleScan only calls handleScanPress (and thus onDisabledScan) when canCaptureValue is true,
// i.e. never for a disabled value - the same guard applies to handlePress. The one path that
// invokes handleScanPress unconditionally is a manual tap on the rendered overlay itself
// (scanNodes wires handleScanPress straight to Scan's onPress), so exercising onDisabledScan
// means rendering a scanNode and clicking it, per the Pressable/TouchableOpacity mock contract.
// render()/fireEvent already wrap themselves in act() - nesting them inside another act() call
// leaves the container unflushed when read back synchronously, so this is deliberately called
// bare, not wrapped in an outer act().
const tapFirstScanNode = (scanNodes: ReturnType<typeof useScanOverlays>['scanNodes']) => {
  const { container } = render(<>{scanNodes}</>)
  const button = container.querySelector('div')
  if (!button) throw new Error('expected a rendered scan node to tap')
  fireEvent.click(button)
}

describe('useScanOverlays', () => {
  it('auto-scan calls onScan with the type uppercased and adds a scanNode', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan }))

    act(() => {
      result.current.handleScan(scan('abc'))
    })

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith({ data: 'abc', type: 'QR' })
    expect(result.current.scanNodes).toHaveLength(1)
  })

  it('re-scanning the same still-mounted value updates in place instead of creating a new node', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan }))

    act(() => {
      result.current.handleScan(scan('abc'))
    })
    expect(result.current.scanNodes).toHaveLength(1)

    act(() => {
      result.current.handleScan(scan('abc', { bounds: { origin: { x: 9, y: 9 }, size: { width: 9, height: 9 } } }))
    })

    // Still exactly one node - the existing view/animation was updated in place, not replaced.
    expect(result.current.scanNodes).toHaveLength(1)
    // onScan is only re-invoked for auto-scan when the value can still be captured; since it was
    // already scanned the second call takes the "existing view" branch without a fresh capture.
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('autoScan=false does not call onScan from handleScan; handlePress captures pending scans', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, autoScan: false }))

    act(() => {
      result.current.handleScan(scan('abc'))
    })
    expect(onScan).not.toHaveBeenCalled()
    expect(result.current.scanNodes).toHaveLength(1)

    act(() => {
      result.current.handlePress()
    })
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith({ data: 'abc', type: 'QR' })

    // A second handlePress should not re-capture the same value - it's already scanned.
    act(() => {
      result.current.handlePress()
    })
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('handlePress is a no-op while autoScan is true', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, autoScan: true }))

    act(() => {
      result.current.handleScan(scan('abc'))
    })
    expect(onScan).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.handlePress()
    })
    // autoScan short-circuits handlePress entirely - no extra onScan call.
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('scanning a disabled value creates its overlay but never calls onScan or onDisabledScan on its own', () => {
    const onScan = jest.fn()
    const onDisabledScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, onDisabledScan, disabledScanValues: ['blocked'] }))

    act(() => {
      result.current.handleScan(scan('blocked'))
    })

    // handleScan only routes into the capture path (handleScanPress) when canCaptureValue is
    // true, which excludes disabled values - so neither callback fires from handleScan itself.
    expect(onDisabledScan).not.toHaveBeenCalled()
    expect(onScan).not.toHaveBeenCalled()
    // The overlay itself is still created (rendered as already-checked), just not captured.
    expect(result.current.scanNodes).toHaveLength(1)
  })

  it('tapping the overlay for a disabled value calls onDisabledScan and never onScan', () => {
    const onScan = jest.fn()
    const onDisabledScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, onDisabledScan, disabledScanValues: ['blocked'] }))

    act(() => {
      result.current.handleScan(scan('blocked'))
    })

    // A manual tap on the overlay wires straight to handleScanPress, unguarded by
    // canCaptureValue - this is the path that actually fires onDisabledScan.
    tapFirstScanNode(result.current.scanNodes)

    expect(onDisabledScan).toHaveBeenCalledWith('blocked')
    expect(onScan).not.toHaveBeenCalled()
  })

  it('a disabled value is never captured by handlePress either', () => {
    const onScan = jest.fn()
    const onDisabledScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, onDisabledScan, autoScan: false, disabledScanValueSet: new Set(['blocked']) }))

    act(() => {
      result.current.handleScan(scan('blocked'))
    })

    tapFirstScanNode(result.current.scanNodes)
    expect(onDisabledScan).toHaveBeenCalledWith('blocked')

    act(() => {
      result.current.handlePress()
    })
    expect(onScan).not.toHaveBeenCalled()
  })

  describe('scanTimeout > 0', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('removes the value from the scanned-tracking set after scanTimeout elapses, allowing recapture', () => {
      const onScan = jest.fn()
      const { result } = renderHook(() => useScanOverlays({ onScan, scanTimeout: 5 }))

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(1)

      // Re-scanning immediately (still within the timeout window) must not re-capture.
      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(1)

      act(() => {
        jest.advanceTimersByTime(5 * 1000)
      })

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(2)
    })
  })

  describe('following a code and fading its box', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => {
      jest.restoreAllMocks()
      jest.useRealTimers()
    })

    // Reports a code every `every` ms, `count` times
    const report = (handleScan: () => void, count: number, every: number) => {
      for (let i = 0; i < count; i++) {
        if (i > 0) act(() => jest.advanceTimersByTime(every))
        act(handleScan)
      }
    }

    it('removes a code reported once after 250ms', () => {
      const onScan = jest.fn()
      const { result } = renderHook(() => useScanOverlays({ onScan }))

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(result.current.scanNodes).toHaveLength(1)

      act(() => {
        jest.advanceTimersByTime(249)
      })
      expect(result.current.scanNodes).toHaveLength(1)

      act(() => {
        jest.advanceTimersByTime(1)
      })
      expect(result.current.scanNodes).toHaveLength(0)
    })

    it('glides to each report on the native driver, over the time since the last one', () => {
      const timing = jest.spyOn(Animated, 'timing')
      const { result } = renderHook(() => useScanOverlays({ onScan: jest.fn() }))

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      act(() => {
        jest.advanceTimersByTime(33)
      })
      act(() => {
        result.current.handleScan(scan('abc', { bounds: { origin: { x: 10, y: 20 }, size: { width: 30, height: 40 } } }))
      })

      const glides = timing.mock.calls.map(([, config]) => config)
      expect(glides).toEqual([expect.objectContaining({ duration: 33, toValue: { x: 10, y: 20 }, useNativeDriver: true }), expect.objectContaining({ duration: 33, toValue: 30, useNativeDriver: true }), expect.objectContaining({ duration: 33, toValue: 40, useNativeDriver: true })])
    })

    it('glides for no longer than 120ms, however slowly the camera reports', () => {
      const timing = jest.spyOn(Animated, 'timing')
      const { result } = renderHook(() => useScanOverlays({ onScan: jest.fn() }))

      report(() => result.current.handleScan(scan('abc')), 2, 200)

      expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 120 }))
    })

    it('fades a box out sooner when the camera reports its code often', () => {
      const { result } = renderHook(() => useScanOverlays({ onScan: jest.fn() }))

      // Every 33ms, as iOS reports: 2.5 reports' worth is about 82ms
      report(() => result.current.handleScan(scan('abc')), 4, 33)

      act(() => {
        jest.advanceTimersByTime(80)
      })
      expect(result.current.scanNodes).toHaveLength(1)

      act(() => {
        jest.advanceTimersByTime(3)
      })
      expect(result.current.scanNodes).toHaveLength(0)
    })

    it('keeps a box at least 80ms and at most 400ms after its last report', () => {
      const { result } = renderHook(() => useScanOverlays({ onScan: jest.fn() }))

      report(() => result.current.handleScan(scan('fast')), 2, 0)
      act(() => {
        jest.advanceTimersByTime(79)
      })
      expect(result.current.scanNodes).toHaveLength(1)
      act(() => {
        jest.advanceTimersByTime(1)
      })
      expect(result.current.scanNodes).toHaveLength(0)

      // 200ms apart: 2.5 reports' worth would be 500ms
      report(() => result.current.handleScan(scan('slow')), 2, 200)
      act(() => {
        jest.advanceTimersByTime(399)
      })
      expect(result.current.scanNodes).toHaveLength(1)
      act(() => {
        jest.advanceTimersByTime(1)
      })
      expect(result.current.scanNodes).toHaveLength(0)
    })

    it('keeps a box whose code is seen again while it fades', () => {
      const original = Animated.timing
      const fades: ((result: { finished: boolean }) => void)[] = []
      jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
        if ((config as { toValue: unknown }).toValue !== 0) return original(value, config)
        return { reset: jest.fn(), start: (callback?: (result: { finished: boolean }) => void) => callback && fades.push(callback), stop: jest.fn() }
      })
      const { result } = renderHook(() => useScanOverlays({ onScan: jest.fn() }))

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      act(() => {
        jest.advanceTimersByTime(250)
      })
      expect(fades).toHaveLength(1)

      // Seen again mid-fade, and the fade then reports finishing anyway
      act(() => {
        result.current.handleScan(scan('abc'))
      })
      act(() => {
        fades[0]({ finished: true })
      })
      expect(result.current.scanNodes).toHaveLength(1)
    })
  })

  it('resetScans clears scanNodes and lets the same value be captured again as brand-new', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan }))

    act(() => {
      result.current.handleScan(scan('abc'))
    })
    expect(result.current.scanNodes).toHaveLength(1)
    expect(onScan).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.resetScans()
    })
    expect(result.current.scanNodes).toHaveLength(0)

    act(() => {
      result.current.handleScan(scan('abc'))
    })
    expect(onScan).toHaveBeenCalledTimes(2)
    expect(result.current.scanNodes).toHaveLength(1)
  })

  describe('reacting to disabledScanValueSet changing after capture', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('handles a value becoming disabled, then no longer disabled, after it was already captured', () => {
      const onScan = jest.fn()
      const { result, rerender } = renderHook(({ disabledScanValueSet }: { disabledScanValueSet?: ReadonlySet<string> }) => useScanOverlays({ onScan, scanTimeout: 30, disabledScanValueSet }), {
        initialProps: { disabledScanValueSet: undefined as ReadonlySet<string> | undefined }
      })

      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(1)
      expect(result.current.scanNodes).toHaveLength(1)

      // Value becomes disabled while its scannedTimers entry is still pending - clears the
      // tracked value/timer and forces its check animation to 1 (the "became disabled" branch).
      act(() => {
        rerender({ disabledScanValueSet: new Set(['abc']) })
      })

      // No longer disabled, and it is not currently in `scanned` (it was cleared above) - hits
      // the "no longer disabled but not currently scanned" branch (animateCheckState to 0).
      act(() => {
        rerender({ disabledScanValueSet: new Set() })
      })

      // Since the tracked value was cleared when it became disabled, scanning it again now
      // (after being re-enabled) captures it as new.
      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(2)
    })

    it('leaves a currently-scanned value alone when it is re-enabled', () => {
      const onScan = jest.fn()
      const { result, rerender } = renderHook(({ disabledScanValueSet }: { disabledScanValueSet?: ReadonlySet<string> }) => useScanOverlays({ onScan, scanTimeout: 30, disabledScanValueSet }), {
        initialProps: { disabledScanValueSet: new Set(['abc']) as ReadonlySet<string> | undefined }
      })

      // First scan while already disabled - never captured.
      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).not.toHaveBeenCalled()

      // Re-enable, then capture it for real this time.
      act(() => {
        rerender({ disabledScanValueSet: new Set() })
      })
      act(() => {
        result.current.handleScan(scan('abc'))
      })
      expect(onScan).toHaveBeenCalledTimes(1)

      // Rerender with the same empty set again - `abc` is currently scanned, so the
      // "no longer disabled but not currently scanned" branch is skipped for it.
      act(() => {
        rerender({ disabledScanValueSet: new Set() })
      })
      expect(onScan).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmount cleanup', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('does not throw when unmounted with pending timers and scannedTimers', () => {
      const onScan = jest.fn()
      const { result, unmount } = renderHook(() => useScanOverlays({ onScan, scanTimeout: 30 }))

      act(() => {
        result.current.handleScan(scan('abc'))
      })

      // Unmount before the 250ms removal delay and the scanTimeout both fire, so both
      // timers.current and scannedTimers.current are non-empty when cleanup runs.
      expect(() => unmount()).not.toThrow()
    })
  })

  it('handles a scan result with no bounds field (the ?? 0 fallback branches)', () => {
    const onScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan }))

    act(() => {
      result.current.handleScan({ data: 'no-bounds', type: 'qr' })
    })

    expect(onScan).toHaveBeenCalledWith({ data: 'no-bounds', type: 'QR' })
    expect(result.current.scanNodes).toHaveLength(1)

    // Re-scan without bounds too, to hit the frame-calculation ?? 0 fallbacks on the
    // "existing view" update-in-place branch as well.
    act(() => {
      result.current.handleScan({ data: 'no-bounds', type: 'qr' })
    })
    expect(result.current.scanNodes).toHaveLength(1)
  })

  it('builds disabledScanValueSet from a plain string array, dropping empty strings', () => {
    const onScan = jest.fn()
    const onDisabledScan = jest.fn()
    const { result } = renderHook(() => useScanOverlays({ onScan, onDisabledScan, disabledScanValues: ['blocked', ''] }))

    act(() => {
      result.current.handleScan(scan('blocked'))
    })

    tapFirstScanNode(result.current.scanNodes)
    expect(onDisabledScan).toHaveBeenCalledWith('blocked')
    expect(onScan).not.toHaveBeenCalled()

    // An empty string must not have been treated as a disabled value itself.
    act(() => {
      result.current.handleScan(scan(''))
    })
    expect(onDisabledScan).not.toHaveBeenCalledWith('')
    expect(onScan).toHaveBeenCalledWith({ data: '', type: 'QR' })
  })
})
