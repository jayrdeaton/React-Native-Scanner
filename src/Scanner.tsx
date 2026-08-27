/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'

import { getScannerConfig } from './ScannerConfig'
import { TimerRing } from './TimerRing'
import type { CameraModule, IconSource, PhotoResult, PictureOptions, SafeAreaModule, ScannerPaperModule, ScanResult } from './types'
import { useScanOverlays } from './useScanOverlays'

const ZOOM_SENSITIVITY = 0.2

// useSafeAreaInsets is a hook and must be called unconditionally on every render (rules of
// hooks); this fallback stands in when safeArea isn't configured, so a per-render branch isn't
// needed.
const useSafeAreaInsetsFallback = () => ({ top: Platform.OS === 'ios' ? 44 : 0, bottom: 0, left: 0, right: 0 })

const SafeAreaWrapper = ({ children, safeArea, style }: { children: ReactNode; safeArea?: SafeAreaModule; style?: ViewStyle }) => {
  const insets = (safeArea?.useSafeAreaInsets ?? useSafeAreaInsetsFallback)()
  return <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }, style]}>{children}</View>
}

type CaptureHandlers = { onPress: () => void; onPressIn: () => void; onPressOut: () => void }

// handleCapturePress reads cameraRef/handlePressRef when invoked, so calling renderCapture(...)
// directly inline (a synchronous function call) reads as "may read a ref during render". Routing
// the call through this child component's own render defers it to JSX composition instead, which
// is how the handlers are meant to be invoked (on interaction, not during Scanner's render).
const RenderCapture = ({ handlers, render }: { handlers: CaptureHandlers; render: (handlers: CaptureHandlers) => ReactNode }) => <>{render(handlers)}</>

export type ScannerProps = {
  accentColor?: string
  autoScan?: boolean
  backgroundColor?: string
  barcodeTypes?: string[]
  camera?: CameraModule
  captureIcon?: IconSource
  children?: ReactNode
  closeIcon?: IconSource
  disabledScanValues?: string[]
  disabledScanValueSet?: ReadonlySet<string>
  facing?: 'front' | 'back'
  mode?: 'scan' | 'photo'
  onClose?: () => void
  onDisabledScan?: (value: string) => void
  onPermissionDenied?: () => void
  onPhoto?: (photo: PhotoResult) => void
  onScan: (result: ScanResult) => void
  onSound?: () => void
  onTimeout?: () => void
  onVibrate?: () => void
  paper?: ScannerPaperModule
  pictureOptions?: PictureOptions
  renderCapture?: (handlers: { onPress: () => void; onPressIn: () => void; onPressOut: () => void }) => ReactNode
  renderClose?: (handlers: { onPress: () => void }) => ReactNode
  renderMenu?: ReactNode
  safeArea?: SafeAreaModule
  scanIcon?: IconSource
  scanTimeout?: number
  scannedIcon?: IconSource
  style?: ViewStyle
  timeout?: number
  torch?: boolean
}

const useCameraPermissionsFallback = (): readonly [{ canAskAgain: boolean; granted: boolean }, () => void] => [{ granted: true, canAskAgain: false }, () => {}]

export const Scanner = ({ accentColor = '#6200ee', autoScan = true, backgroundColor = 'black', barcodeTypes, camera: cameraProp, captureIcon, children, closeIcon, disabledScanValues, disabledScanValueSet, facing = 'back', mode = 'scan', onClose, onDisabledScan, onPermissionDenied, onPhoto, onScan, onSound, onTimeout, onVibrate, paper: paperProp, pictureOptions, renderCapture, renderClose, renderMenu, safeArea: safeAreaProp, scanIcon, scanTimeout = 0, scannedIcon, style, timeout = 0, torch = false }: ScannerProps) => {
  // Per-instance props always win; otherwise fall back to whatever configureScanner()/
  // <ScannerProvider> set globally.
  const scannerConfig = getScannerConfig()
  const camera = cameraProp ?? scannerConfig.camera
  const paper = paperProp ?? scannerConfig.paper
  const safeArea = safeAreaProp ?? scannerConfig.safeArea

  const cameraRef = useRef<any>(null)
  // useCameraPermissions is a hook and must be called unconditionally on every render (rules of
  // hooks), same reasoning as useSafeAreaInsetsFallback above.
  const [permission, requestPermission] = (camera?.useCameraPermissions ?? useCameraPermissionsFallback)()
  const [timerStarted, setTimerStarted] = useState<string | null>(() => (timeout > 0 ? new Date().toISOString() : null))
  const [zoom, setZoom] = useState(0)
  const [baseZoom, setBaseZoom] = useState(0)
  const [prevTimeout, setPrevTimeout] = useState(timeout)
  if (timeout !== prevTimeout) {
    setPrevTimeout(timeout)
    if (timeout > 0) setTimerStarted(new Date().toISOString())
  }

  const handlePressIn = useCallback(() => setTimerStarted(null), [])
  const handlePressOut = useCallback(() => {
    if (timeout > 0) setTimerStarted(new Date().toISOString())
  }, [timeout])
  const handleTimerEnd = useCallback(() => {
    setTimerStarted(null)
    onTimeout?.()
    onClose?.()
  }, [onClose, onTimeout])

  const handlePressRef = useRef<(() => void) | null>(null)

  const handleCapturePress = useCallback(async () => {
    if (mode === 'photo') {
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync(pictureOptions)
          onPhoto?.(photo)
        } catch {}
      }
      if (timeout > 0) setTimerStarted(new Date().toISOString())
      return
    }
    handlePressRef.current?.()
  }, [mode, onPhoto, pictureOptions, timeout])

  const { handlePress, handleScan, scanNodes } = useScanOverlays({
    accentColor,
    autoScan,
    disabledScanValues,
    disabledScanValueSet,
    onCapture: () => {
      if (timeout > 0) setTimerStarted(new Date().toISOString())
    },
    onDisabledScan,
    onScan,
    onSound,
    onVibrate,
    paper,
    scanIcon,
    scanTimeout,
    scannedIcon
  })

  useEffect(() => {
    handlePressRef.current = handlePress
  })

  useEffect(() => {
    if (permission?.canAskAgain && !permission?.granted) {
      requestPermission()
    } else if (permission?.granted === false) {
      onPermissionDenied?.()
    }
  }, [onPermissionDenied, permission, requestPermission])

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event: any) => {
          'worklet'
          const scale = typeof event.scale === 'number' ? event.scale : 1
          scheduleOnRN(setZoom, Math.max(0, Math.min(1, baseZoom + (scale - 1) * ZOOM_SENSITIVITY)))
        })
        .onEnd(() => {
          'worklet'
          scheduleOnRN(setBaseZoom, Number.isFinite(zoom) ? zoom : 0)
        }),
    [baseZoom, zoom]
  )

  const cameraGranted = permission?.granted === true
  const cameraDenied = permission?.granted === false

  const captureHandlers = { onPress: handleCapturePress, onPressIn: handlePressIn, onPressOut: handlePressOut }
  const captureButton = renderCapture ? (
    <RenderCapture handlers={captureHandlers} render={renderCapture} />
  ) : typeof captureIcon === 'function' ? (
    <Pressable {...captureHandlers} hitSlop={40} style={[styles.captureButton, { backgroundColor: accentColor }]}>
      {captureIcon({ color: 'white', size: 32 })}
    </Pressable>
  ) : (
    <Pressable {...captureHandlers} hitSlop={40} style={[styles.captureButton, { backgroundColor: accentColor }]} />
  )

  const closeHandlers = { onPress: onClose! }
  const closeButton = onClose ? (
    renderClose ? (
      renderClose(closeHandlers)
    ) : typeof closeIcon === 'function' ? (
      <Pressable onPress={onClose} style={styles.closeButton}>
        {closeIcon({ color: 'white', size: 24 })}
      </Pressable>
    ) : (
      <Pressable onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    )
  ) : null

  return (
    <GestureDetector gesture={pinch}>
      <Pressable style={styles.container} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {cameraGranted && camera ? <camera.CameraView ref={cameraRef} barcodeScannerSettings={barcodeTypes ? { barcodeTypes } : undefined} enableTorch={torch} facing={facing} onBarcodeScanned={handleScan} style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} zoom={zoom} /> : <View style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} />}
        <SafeAreaWrapper safeArea={safeArea} style={styles.overlay}>
          <View style={styles.header} pointerEvents='box-none'>
            <View style={styles.headerSide}>{closeButton}</View>
            <View style={styles.headerSide}>{renderMenu ?? null}</View>
          </View>
          {cameraDenied ? (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>Camera Permission Denied</Text>
            </View>
          ) : null}
          {children}
          {scanNodes}
          <View style={styles.bottomBar} pointerEvents='box-none'>
            <View style={styles.bottomSide} pointerEvents='box-none' />
            <View style={styles.bottomCenter} pointerEvents='box-none'>
              {timeout > 0 ? (
                <View style={styles.timerWrapper}>
                  <TimerRing color={accentColor} duration={timeout} onStop={handleTimerEnd} radius={38} started={timerStarted} width={6} />
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
}

const styles = StyleSheet.create({
  bottomBar: { alignItems: 'center', bottom: 24, flexDirection: 'row', left: 0, paddingHorizontal: 12, position: 'absolute', right: 0 },
  bottomCenter: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bottomSide: { flex: 1 },
  camera: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  captureButton: { alignItems: 'center', borderRadius: 32, height: 64, justifyContent: 'center', width: 64 },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  closeText: { color: 'white', fontSize: 18 },
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerSide: { minHeight: 48, minWidth: 48 },
  overlay: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  permission: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  permissionText: { color: 'white', fontSize: 18 },
  timerWrapper: { alignItems: 'center', justifyContent: 'center' }
})
