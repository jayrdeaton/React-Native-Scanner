/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { TimerRing } from './TimerRing'
import type { IconSource, MenuBag, ScanResult } from './types'
import { useScanOverlays } from './useScanOverlays'

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
  disabledScanValues?: string[]
  disabledScanValueSet?: ReadonlySet<string>
  onClose?: () => void
  onDisabledScan?: (value: string) => void
  onPermissionDenied?: () => void
  onScan: (result: ScanResult) => void
  onSound?: () => void
  onTimeout?: () => void
  onVibrate?: () => void
  renderCapture?: (handlers: { onPress: () => void; onPressIn: () => void; onPressOut: () => void }) => ReactNode
  renderMenu?: (bag: MenuBag) => ReactNode
  scanIcon?: IconSource
  scanTimeout?: number
  scannedIcon?: IconSource
  style?: ViewStyle
  timeout?: number
}

export const Scanner = ({ accentColor = '#6200ee', autoScan = true, backgroundColor = 'black', barcodeTypes, captureIcon, children, disabledScanValues, disabledScanValueSet, onClose, onDisabledScan, onPermissionDenied, onScan, onSound, onTimeout, onVibrate, renderCapture, renderMenu, scanIcon, scanTimeout = 0, scannedIcon, style, timeout = 0 }: ScannerProps) => {
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [{ granted: true, canAskAgain: false }, () => {}]
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const [timerStarted, setTimerStarted] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
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

  const captureHandlers = { onPress: handlePress, onPressIn: handlePressIn, onPressOut: handlePressOut }
  const resolvedCaptureIcon = captureIcon ?? 'radiobox-marked'
  const captureButton = renderCapture ? (
    renderCapture(captureHandlers)
  ) : typeof resolvedCaptureIcon === 'function' ? (
    <Pressable {...captureHandlers} style={[styles.captureButton, { backgroundColor: accentColor }]}>
      {resolvedCaptureIcon({ color: 'white', size: 82 })}
    </Pressable>
  ) : PaperIconButton ? (
    <PaperIconButton iconColor='white' icon={resolvedCaptureIcon} size={82} onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} />
  ) : (
    <Pressable {...captureHandlers} style={[styles.captureButton, { backgroundColor: accentColor }]} />
  )

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
