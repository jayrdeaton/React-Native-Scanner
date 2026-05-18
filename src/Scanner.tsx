/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { Scan } from './Scan'
import { TimerRing } from './TimerRing'
import type { BarcodeScanResult, MenuBag, ScanResult } from './types'

let CameraView: any = null
let useCameraPermissions: any = null
try {
  const cam = require('expo-camera')
  CameraView = cam.CameraView
  useCameraPermissions = cam.useCameraPermissions
} catch {}

let PortalHost: any = null
try {
  PortalHost = require('react-native-paper').Portal.Host
} catch {}

let PaperText: any = null
try {
  PaperText = require('react-native-paper').Text
} catch {}

let PaperIconButton: any = null
try {
  PaperIconButton = require('react-native-paper').IconButton
} catch {}

let useSafeAreaInsets: any = null
try {
  useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets
} catch {}

const DURATION = 250
const USE_NATIVE_DRIVER = false
const REMOVAL_DELAY = 250
const ZOOM_SENSITIVITY = 0.2

type AnimationState = {
  check: Animated.Value
  height: Animated.Value
  origin: Animated.ValueXY
  width: Animated.Value
}

export type ScannerProps = {
  accentColor?: string
  autoScan?: boolean
  backgroundColor?: string
  barcodeTypes?: string[]
  children?: ReactNode
  disabledScanValues?: string[]
  disabledScanValueSet?: ReadonlySet<string>
  onClose?: () => void
  onDisabledScan?: (value: string) => void
  onPermissionDenied?: () => void
  onScan: (result: ScanResult) => void
  onSound?: () => void
  onTimeout?: () => void
  onVibrate?: () => void
  renderMenu?: (bag: MenuBag) => ReactNode
  scanTimeout?: number
  style?: ViewStyle
  timeout?: number
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

const SafeAreaWrapper = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => {
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: Platform.OS === 'ios' ? 44 : 0, bottom: 0, left: 0, right: 0 }
  return (
    <View
      style={[
        styles.flex,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
    >
      {children}
    </View>
  )
}

export const Scanner = ({ accentColor = '#6200ee', autoScan = true, backgroundColor = 'black', barcodeTypes, children, disabledScanValues, disabledScanValueSet, onClose, onDisabledScan, onPermissionDenied, onScan, onSound, onTimeout, onVibrate, renderMenu, scanTimeout = 0, style, timeout = 0 }: ScannerProps) => {
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [{ granted: true, canAskAgain: false }, () => {}]
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const [timerStarted, setTimerStarted] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const [zoom, setZoom] = useState(0)
  const [baseZoom, setBaseZoom] = useState(0)
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
    if (permission?.canAskAgain && !permission?.granted) {
      requestPermission()
    } else if (permission?.granted === false) {
      onPermissionDenied?.()
    }
  }, [onPermissionDenied, permission, requestPermission])

  useEffect(() => {
    if (timeout > 0) setTimerStarted(new Date().toISOString())
  }, [timeout])

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
      if (timeout > 0) setTimerStarted(new Date().toISOString())
    },
    [isDisabledValue, onDisabledScan, onScan, onSound, onVibrate, scheduleScannedRemoval, timeout]
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

  const handlePressIn = useCallback(() => setTimerStarted(null), [])
  const handlePressOut = useCallback(() => {
    if (timeout > 0) setTimerStarted(new Date().toISOString())
  }, [timeout])

  const handleTimerEnd = useCallback(() => {
    setTimerStarted(null)
    onTimeout?.()
    onClose?.()
  }, [onClose, onTimeout])

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event: any) => {
          const scale = typeof event.scale === 'number' ? event.scale : 1
          runOnJS(setZoom)(Math.max(0, Math.min(1, baseZoom + (scale - 1) * ZOOM_SENSITIVITY)))
        })
        .onEnd(() => {
          runOnJS(setBaseZoom)(Number.isFinite(zoom) ? zoom : 0)
        }),
    [baseZoom, zoom]
  )

  const cameraGranted = permission?.granted === true
  const cameraDenied = permission?.granted === false

  const scanNodes = useMemo(
    () =>
      Object.values(views).map((scan) => {
        const animation = animations.current[scan.data]
        if (!animation) return null
        return <Scan key={scan.data} color={accentColor} check={animation.check} height={animation.height} onPress={handleScanPress} origin={animation.origin} scan={scan} width={animation.width} />
      }),
    [accentColor, handleScanPress, views]
  )

  const captureButton = PaperIconButton ? <PaperIconButton iconColor='white' icon='radiobox-marked' size={82} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} /> : <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[styles.captureButton, { backgroundColor: accentColor }]} />

  const closeButton =
    onClose && PaperIconButton ? (
      <PaperIconButton iconColor={accentColor} icon='close' onPress={onClose} />
    ) : onClose ? (
      <Pressable onPress={onClose} style={styles.closeButton}>
        {PaperText ? <PaperText>✕</PaperText> : null}
      </Pressable>
    ) : null

  const menuBag: MenuBag = { barcodeTypes: barcodeTypes ?? [], facing, setFacing, setTorch, torch }

  const menuButton =
    renderMenu && PaperIconButton ? (
      <PaperIconButton iconColor={accentColor} icon='dots-vertical' onPress={() => {}} />
    ) : renderMenu ? (
      <Pressable style={styles.menuFallback} onPress={() => {}}>
        {PaperText ? <PaperText>⋮</PaperText> : null}
      </Pressable>
    ) : null

  const content = (
    <GestureDetector gesture={pinch}>
      <Pressable style={styles.container} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {cameraGranted && CameraView ? <CameraView barcodeScannerSettings={barcodeTypes ? { barcodeTypes } : undefined} enableTorch={torch} facing={facing} onBarcodeScanned={handleScan} style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} zoom={zoom} /> : <View style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} />}
        <SafeAreaWrapper style={styles.overlay}>
          <View style={styles.header} pointerEvents='box-none'>
            <View style={styles.headerSide}>{closeButton}</View>
            <View style={styles.headerSide}>{renderMenu ? renderMenu(menuBag) : menuButton}</View>
          </View>
          {cameraDenied ? <View style={styles.permission}>{PaperText ? <PaperText variant='titleLarge'>Camera Permission Denied</PaperText> : null}</View> : null}
          {children}
          {scanNodes}
          <View style={styles.bottomBar} pointerEvents='box-none'>
            <View style={styles.bottomSide} pointerEvents='box-none' />
            <View style={styles.bottomCenter} pointerEvents='box-none'>
              {timeout > 0 ? (
                <View style={styles.timerWrapper}>
                  <TimerRing color={accentColor} duration={timeout} onStop={handleTimerEnd} radius={41} started={timerStarted} />
                  {captureButton}
                </View>
              ) : (
                captureButton
              )}
            </View>
            <View style={styles.bottomSide} pointerEvents='box-none' />
          </View>
        </SafeAreaWrapper>
      </Pressable>
    </GestureDetector>
  )

  return PortalHost ? <PortalHost>{content}</PortalHost> : content
}

const styles = StyleSheet.create({
  bottomBar: { alignItems: 'center', bottom: 24, flexDirection: 'row', left: 0, paddingHorizontal: 12, position: 'absolute', right: 0 },
  bottomCenter: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bottomSide: { flex: 1 },
  camera: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  captureButton: { borderRadius: 41, height: 82, width: 82 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerSide: { minHeight: 48, minWidth: 48 },
  menuFallback: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  overlay: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  permission: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  timerWrapper: { alignItems: 'center', justifyContent: 'center' }
})
