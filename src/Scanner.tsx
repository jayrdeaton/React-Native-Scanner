/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { TimerRing } from './TimerRing'
import type { IconSource, PhotoResult, PictureOptions, ScanResult } from './types'
import { useScanOverlays } from './useScanOverlays'

let CameraView: any = null
let useCameraPermissions: any = null
try {
  const cam = require('expo-camera')
  CameraView = cam.CameraView
  useCameraPermissions = cam.useCameraPermissions
} catch {}

let useSafeAreaInsets: any = null
try {
  useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets
} catch {}

const ZOOM_SENSITIVITY = 0.2

const SafeAreaWrapper = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => {
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: Platform.OS === 'ios' ? 44 : 0, bottom: 0, left: 0, right: 0 }
  return <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }, style]}>{children}</View>
}

export type ScannerProps = {
  accentColor?: string
  autoScan?: boolean
  backgroundColor?: string
  barcodeTypes?: string[]
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
  pictureOptions?: PictureOptions
  renderCapture?: (handlers: { onPress: () => void; onPressIn: () => void; onPressOut: () => void }) => ReactNode
  renderClose?: (handlers: { onPress: () => void }) => ReactNode
  renderMenu?: ReactNode
  scanIcon?: IconSource
  scanTimeout?: number
  scannedIcon?: IconSource
  style?: ViewStyle
  timeout?: number
  torch?: boolean
}

export const Scanner = ({ accentColor = '#6200ee', autoScan = true, backgroundColor = 'black', barcodeTypes, captureIcon, children, closeIcon, disabledScanValues, disabledScanValueSet, facing = 'back', mode = 'scan', onClose, onDisabledScan, onPermissionDenied, onPhoto, onScan, onSound, onTimeout, onVibrate, pictureOptions, renderCapture, renderClose, renderMenu, scanIcon, scanTimeout = 0, scannedIcon, style, timeout = 0, torch = false }: ScannerProps) => {
  const cameraRef = useRef<any>(null)
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [{ granted: true, canAskAgain: false }, () => {}]
  const [timerStarted, setTimerStarted] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0)
  const [baseZoom, setBaseZoom] = useState(0)

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
    scanIcon,
    scanTimeout,
    scannedIcon
  })

  handlePressRef.current = handlePress

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

  const captureHandlers = { onPress: handleCapturePress, onPressIn: handlePressIn, onPressOut: handlePressOut }
  const captureButton = renderCapture ? (
    renderCapture(captureHandlers)
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
        {cameraGranted && CameraView ? <CameraView ref={cameraRef} barcodeScannerSettings={barcodeTypes ? { barcodeTypes } : undefined} enableTorch={torch} facing={facing} onBarcodeScanned={handleScan} style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} zoom={zoom} /> : <View style={[StyleSheet.absoluteFill, styles.camera, { backgroundColor }, style]} />}
        <SafeAreaWrapper style={styles.overlay}>
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
