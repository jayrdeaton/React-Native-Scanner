import { ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing } from 'react-native'

import { Scan } from './Scan'
import type { BarcodeScanResult, IconSource, ScannerPaperModule, ScanResult } from './types'

const DURATION = 250
// Every overlay animation runs on the native driver, on the UI thread, so the box keeps moving while the JS thread is
// busy (with a scan's own work, say). That's why Scan draws the box with transforms only.
const USE_NATIVE_DRIVER = true

// The camera reports a code it sees about every frame on iOS, and as often as ML Kit reads one on Android. The box glides
// to each report's bounds over about the time since the last one, so it moves steadily a report behind the code at
// whatever rate the camera reports, rather than springing after it.
const MAX_GLIDE = 120
// Once a code stops being reported, its box stays a few reports' worth, so a missed frame doesn't make it blink, then
// fades out
const HOLD_REPORTS = 2.5
const MIN_HOLD = 80
const MAX_HOLD = 400
const FADE = 100
// How often a code is taken to be reported until its second report says
const FIRST_INTERVAL = 100

type AnimationState = {
  check: Animated.Value
  fade?: Animated.CompositeAnimation
  height: Animated.Value
  // The time between this code's reports, smoothed
  interval?: number
  opacity: Animated.Value
  origin: Animated.ValueXY
  reportedAt: number
  width: Animated.Value
}

const stopAnimationState = (animation?: AnimationState) => {
  animation?.check.stopAnimation()
  animation?.height.stopAnimation()
  animation?.opacity.stopAnimation()
  animation?.width.stopAnimation()
  animation?.origin.stopAnimation()
}

const holdFor = (interval = FIRST_INTERVAL) => Math.min(Math.max(interval * HOLD_REPORTS, MIN_HOLD), MAX_HOLD)

const frameOf = (scan: BarcodeScanResult) => ({ height: scan.bounds?.size.height ?? 0, width: scan.bounds?.size.width ?? 0, x: scan.bounds?.origin.x ?? 0, y: scan.bounds?.origin.y ?? 0 })

// Moves a code's box to its latest bounds
const follow = (animation: AnimationState, scan: BarcodeScanResult, now: number) => {
  const gap = Math.min(now - animation.reportedAt, MAX_HOLD)
  animation.interval = animation.interval === undefined ? gap : (animation.interval + gap) / 2
  animation.reportedAt = now
  if (animation.fade) {
    // Seen again while fading out
    animation.fade = undefined
    animation.opacity.setValue(1)
  }
  const { height, width, x, y } = frameOf(scan)
  const glide = { duration: Math.min(animation.interval, MAX_GLIDE), easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER }
  Animated.timing(animation.origin, { ...glide, toValue: { x, y } }).start()
  Animated.timing(animation.width, { ...glide, toValue: width }).start()
  Animated.timing(animation.height, { ...glide, toValue: height }).start()
}

const animateCheckState = (check: Animated.Value | undefined, toValue: number) => {
  if (!check) return
  check.stopAnimation()
  Animated.timing(check, { toValue, duration: DURATION, useNativeDriver: USE_NATIVE_DRIVER }).start()
}

const clearTrackedValue = (trackedValues: RefObject<Set<string>>, trackedTimers: RefObject<Record<string, ReturnType<typeof setTimeout>>>, value: string) => {
  trackedValues.current.delete(value)
  clearTimeout(trackedTimers.current[value])
  delete trackedTimers.current[value]
}

const createAnimationState = (scan: BarcodeScanResult, checked: boolean, now: number): AnimationState => {
  const { height, width, x, y } = frameOf(scan)
  return { check: new Animated.Value(checked ? 1 : 0), height: new Animated.Value(height), opacity: new Animated.Value(1), origin: new Animated.ValueXY({ x, y }), reportedAt: now, width: new Animated.Value(width) }
}

export type UseScanOverlaysOptions = {
  accentColor?: string
  autoScan?: boolean
  disabledScanValues?: string[]
  disabledScanValueSet?: ReadonlySet<string>
  onCapture?: () => void
  onDisabledScan?: (value: string) => void
  onScan: (result: ScanResult) => void
  onSound?: () => void
  onVibrate?: () => void
  paper?: ScannerPaperModule
  scanIcon?: IconSource
  scanTimeout?: number
  scannedIcon?: IconSource
}

export type UseScanOverlaysResult = {
  handleScan: (scan: BarcodeScanResult) => void
  handlePress: () => void
  resetScans: () => void
  scanNodes: ReactNode[]
}

export const useScanOverlays = ({ accentColor = '#6200ee', autoScan = true, disabledScanValues, disabledScanValueSet, onCapture, onDisabledScan, onScan, onSound, onVibrate, paper, scanIcon, scanTimeout = 0, scannedIcon }: UseScanOverlaysOptions): UseScanOverlaysResult => {
  const [views, setViews] = useState<Record<string, BarcodeScanResult>>({})
  const animations = useRef<Record<string, AnimationState>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const scannedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const viewsRef = useRef<Record<string, BarcodeScanResult>>({})
  const scanned = useRef<Set<string>>(new Set())

  const disabledValueSet = useMemo(() => {
    if (disabledScanValueSet) return disabledScanValueSet
    return new Set((disabledScanValues ?? []).filter((v): v is string => typeof v === 'string' && v.length > 0))
  }, [disabledScanValueSet, disabledScanValues])

  const isDisabledValue = useCallback((value: string) => disabledValueSet.has(value), [disabledValueSet])
  const canCaptureValue = useCallback((value: string) => !isDisabledValue(value) && !scanned.current.has(value), [isDisabledValue])

  useEffect(() => {
    const currentTimers = timers.current
    const currentScannedTimers = scannedTimers.current
    const currentAnimations = animations.current
    return () => {
      Object.values(currentTimers).forEach(clearTimeout)
      Object.values(currentScannedTimers).forEach(clearTimeout)
      Object.values(currentAnimations).forEach(stopAnimationState)
    }
  }, [])

  useEffect(() => {
    Object.keys(scannedTimers.current).forEach((value) => {
      if (isDisabledValue(value)) clearTrackedValue(scanned, scannedTimers, value)
    })
    Object.entries(animations.current).forEach(([value, animation]) => {
      if (isDisabledValue(value)) {
        animateCheckState(animation.check, 1)
        return
      }
      if (!scanned.current.has(value)) animateCheckState(animation.check, 0)
    })
  }, [isDisabledValue])

  const scheduleScannedRemoval = useCallback(
    (value: string) => {
      if (scanTimeout === 0) return
      clearTimeout(scannedTimers.current[value])
      scannedTimers.current[value] = setTimeout(() => {
        clearTrackedValue(scanned, scannedTimers, value)
        animateCheckState(animations.current[value]?.check, 0)
      }, scanTimeout * 1000)
    },
    [scanTimeout]
  )

  const removeFromView = useCallback((value: string) => {
    stopAnimationState(animations.current[value])
    setViews((prev) => {
      const { [value]: removed, ...rest } = prev
      if (!removed) return prev
      viewsRef.current = rest
      return rest
    })
    delete animations.current[value]
  }, [])

  // Fades a code's box out once the camera has gone a few reports without it
  const scheduleFade = useCallback(
    (value: string, animation: AnimationState) => {
      clearTimeout(timers.current[value])
      timers.current[value] = setTimeout(() => {
        delete timers.current[value]
        const fade = Animated.timing(animation.opacity, { toValue: 0, duration: FADE, useNativeDriver: USE_NATIVE_DRIVER })
        animation.fade = fade
        fade.start(({ finished }) => {
          if (finished && animation.fade === fade) removeFromView(value)
        })
      }, holdFor(animation.interval))
    },
    [removeFromView]
  )

  const handleScanPress = useCallback(
    (scan: BarcodeScanResult) => {
      if (isDisabledValue(scan.data)) {
        clearTrackedValue(scanned, scannedTimers, scan.data)
        animateCheckState(animations.current[scan.data]?.check, 1)
        onDisabledScan?.(scan.data)
        return
      }
      if (!scanned.current.has(scan.data)) {
        scanned.current.add(scan.data)
        animateCheckState(animations.current[scan.data]?.check, 1)
      }
      scheduleScannedRemoval(scan.data)
      onVibrate?.()
      onSound?.()
      onScan({ data: scan.data, type: scan.type.toUpperCase() })
      onCapture?.()
    },
    [isDisabledValue, onCapture, onDisabledScan, onScan, onSound, onVibrate, scheduleScannedRemoval]
  )

  const handleScan = useCallback(
    (scan: BarcodeScanResult) => {
      const disabled = isDisabledValue(scan.data)
      if (autoScan && canCaptureValue(scan.data)) handleScanPress(scan)

      const now = Date.now()
      let animation = animations.current[scan.data]
      if (viewsRef.current[scan.data] && animation) {
        follow(animation, scan, now)
      } else {
        animation = createAnimationState(scan, scanned.current.has(scan.data) || disabled, now)
        animations.current[scan.data] = animation
        setViews((prev) => {
          const next = { ...prev, [scan.data]: scan }
          viewsRef.current = next
          return next
        })
      }
      scheduleFade(scan.data, animation)
    },
    [autoScan, canCaptureValue, handleScanPress, isDisabledValue, scheduleFade]
  )

  const handlePress = useCallback(() => {
    if (autoScan) return
    Object.values(viewsRef.current).forEach((scan) => {
      if (!canCaptureValue(scan.data)) return
      handleScanPress(scan)
    })
  }, [autoScan, canCaptureValue, handleScanPress])

  const resetScans = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout)
    Object.values(scannedTimers.current).forEach(clearTimeout)
    Object.values(animations.current).forEach(stopAnimationState)
    timers.current = {}
    scannedTimers.current = {}
    animations.current = {}
    viewsRef.current = {}
    scanned.current.clear()
    setViews({})
  }, [])

  const scanNodes = useMemo(
    () =>
      Object.values(views).map((scan) => {
        const animation = animations.current[scan.data]
        if (!animation) return null
        return <Scan key={scan.data} color={accentColor} check={animation.check} height={animation.height} onPress={handleScanPress} opacity={animation.opacity} origin={animation.origin} paper={paper} scan={scan} scanIcon={scanIcon} scannedIcon={scannedIcon} width={animation.width} />
      }),
    [accentColor, handleScanPress, paper, scanIcon, scannedIcon, views]
  )

  return { handlePress, handleScan, resetScans, scanNodes }
}
