import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native'

import { Scan } from './Scan'
import type { BarcodeScanResult, IconSource, ScanResult } from './types'

const DURATION = 250
const USE_NATIVE_DRIVER = false
const REMOVAL_DELAY = 250

type AnimationState = {
  check: Animated.Value
  height: Animated.Value
  origin: Animated.ValueXY
  width: Animated.Value
}

const stopAnimationState = (animation?: AnimationState) => {
  animation?.check.stopAnimation()
  animation?.height.stopAnimation()
  animation?.width.stopAnimation()
  animation?.origin.stopAnimation()
}

const animateCheckState = (check: Animated.Value | undefined, toValue: number) => {
  if (!check) return
  check.stopAnimation()
  Animated.timing(check, { toValue, duration: DURATION, useNativeDriver: USE_NATIVE_DRIVER }).start()
}

const clearTrackedValue = (trackedValues: React.RefObject<Set<string>>, trackedTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>, value: string) => {
  trackedValues.current.delete(value)
  clearTimeout(trackedTimers.current[value])
  delete trackedTimers.current[value]
}

const createAnimationState = (scan: BarcodeScanResult, checked: boolean): AnimationState => ({
  check: new Animated.Value(checked ? 1 : 0),
  height: new Animated.Value(scan.bounds?.size.height ?? 0),
  origin: new Animated.ValueXY({ x: scan.bounds?.origin.x ?? 0, y: scan.bounds?.origin.y ?? 0 }),
  width: new Animated.Value(scan.bounds?.size.width ?? 0)
})

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

export const useScanOverlays = ({ accentColor = '#6200ee', autoScan = true, disabledScanValues, disabledScanValueSet, onCapture, onDisabledScan, onScan, onSound, onVibrate, scanIcon, scanTimeout = 0, scannedIcon }: UseScanOverlaysOptions): UseScanOverlaysResult => {
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
    clearTimeout(timers.current[value])
    timers.current[value] = setTimeout(() => {
      stopAnimationState(animations.current[value])
      setViews((prev) => {
        const { [value]: removed, ...rest } = prev
        if (!removed) return prev
        viewsRef.current = rest
        return rest
      })
      delete animations.current[value]
      delete timers.current[value]
    }, REMOVAL_DELAY)
  }, [])

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

      const existingView = viewsRef.current[scan.data]
      const animation = animations.current[scan.data]
      const frame = { x: scan.bounds?.origin.x ?? 0, y: scan.bounds?.origin.y ?? 0, height: scan.bounds?.size.height ?? 0, width: scan.bounds?.size.width ?? 0 }

      if (existingView && animation) {
        Animated.parallel([Animated.spring(animation.origin, { toValue: { x: frame.x, y: frame.y }, useNativeDriver: USE_NATIVE_DRIVER }), Animated.spring(animation.height, { toValue: frame.height, useNativeDriver: USE_NATIVE_DRIVER }), Animated.spring(animation.width, { toValue: frame.width, useNativeDriver: USE_NATIVE_DRIVER })]).start()
      } else {
        animations.current[scan.data] = createAnimationState(scan, scanned.current.has(scan.data) || disabled)
        setViews((prev) => {
          const next = { ...prev, [scan.data]: scan }
          viewsRef.current = next
          return next
        })
      }
      removeFromView(scan.data)
    },
    [autoScan, canCaptureValue, handleScanPress, isDisabledValue, removeFromView]
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
        return <Scan key={scan.data} color={accentColor} check={animation.check} height={animation.height} onPress={handleScanPress} origin={animation.origin} scan={scan} scanIcon={scanIcon} scannedIcon={scannedIcon} width={animation.width} />
      }),
    [accentColor, handleScanPress, scanIcon, scannedIcon, views]
  )

  return { handlePress, handleScan, resetScans, scanNodes }
}
