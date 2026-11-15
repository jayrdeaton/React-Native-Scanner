/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useCallback, useMemo } from 'react'
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Bounds } from './Bounds'
import { type Frame, place } from './place'
import type { BarcodeScanResult, IconSource, ScannerPaperModule } from './types'

const ICON_SIZE = 30
const ICON_SLOT = ICON_SIZE + 8
// The touch area is a square this size, scaled to the code's box
const TARGET = 100
const ACTIVATE = [{ name: 'activate' }]

const resolveIcon = (icon: IconSource): any => {
  if (typeof icon === 'function') return icon({ color: 'white', size: ICON_SIZE })
  return icon
}

export type ScanProps = Frame & {
  check: Animated.Value
  color: string
  onPress: (scan: BarcodeScanResult) => void
  opacity: Animated.Value
  paper?: ScannerPaperModule
  scan: BarcodeScanResult
  scanIcon?: IconSource
  scannedIcon?: IconSource
}

function ScanComponent({ check, color, height, onPress, opacity, origin, paper, scan, scanIcon, scannedIcon, width }: ScanProps) {
  const handlePress = useCallback(() => onPress(scan), [onPress, scan])

  const { checkOpacity, iconTransform, scanOpacity, targetTransform } = useMemo(() => {
    const frame = { height, origin, width }
    return {
      checkOpacity: check.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      iconTransform: place(frame, 0.5, 0.5, ICON_SLOT),
      scanOpacity: check.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      targetTransform: [...place(frame, 0.5, 0.5, TARGET), { scaleX: Animated.multiply(width, 1 / TARGET) }, { scaleY: Animated.multiply(height, 1 / TARGET) }]
    }
  }, [check, height, origin, width])

  // A code read without its bounds (iOS's PDF417, Code 39 and Codabar) gets no touch area: scaled to nothing, it could
  // still catch taps in the corner of the screen
  const touchable = !!scan.bounds?.size.width && !!scan.bounds.size.height

  const resolvedScanIcon = scanIcon ? resolveIcon(scanIcon) : null
  const resolvedScannedIcon = scannedIcon ? resolveIcon(scannedIcon) : null

  const scanIndicator = resolvedScanIcon && typeof resolvedScanIcon !== 'string' ? <View style={[styles.iconButton, styles.iconCenter]}>{resolvedScanIcon}</View> : paper ? <paper.IconButton iconColor='white' containerColor={color} icon={resolvedScanIcon ?? 'qrcode'} size={ICON_SIZE} style={styles.iconButton} /> : <View style={[styles.fallbackIcon, { backgroundColor: color }]} />

  const checkIndicator =
    resolvedScannedIcon && typeof resolvedScannedIcon !== 'string' ? (
      <View style={[styles.iconButton, styles.iconCenter]}>{resolvedScannedIcon}</View>
    ) : paper ? (
      <paper.IconButton iconColor='white' containerColor={color} icon={resolvedScannedIcon ?? 'check'} size={ICON_SIZE} style={styles.iconButton} />
    ) : (
      <View style={[styles.fallbackIcon, { backgroundColor: color }]}>
        <Animated.Text style={styles.checkText}>✓</Animated.Text>
      </View>
    )

  // The layers cover the camera but only the touch area takes a touch, and the press dims the whole box. Every piece is
  // moved into place with transforms, so the native driver animates it on the UI thread.
  return (
    <Animated.View pointerEvents='box-none' style={[StyleSheet.absoluteFill, { opacity }]}>
      <TouchableOpacity accessible={false} onPress={handlePress} style={[StyleSheet.absoluteFill, styles.passThrough]}>
        {touchable && <Animated.View accessibilityActions={ACTIVATE} accessibilityRole='button' accessible onAccessibilityAction={handlePress} style={[styles.target, { transform: targetTransform }]} />}
        <Bounds color={color} height={height} origin={origin} width={width} />
        <Animated.View pointerEvents='none' style={[styles.icon, { transform: iconTransform }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, { opacity: scanOpacity }]}>{scanIndicator}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, { opacity: checkOpacity }]}>{checkIndicator}</Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export const Scan = memo(ScanComponent)

const styles = StyleSheet.create({
  checkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  fallbackIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  icon: {
    height: ICON_SLOT,
    left: 0,
    position: 'absolute',
    top: 0,
    width: ICON_SLOT
  },
  iconButton: {
    alignItems: 'center',
    height: ICON_SLOT,
    justifyContent: 'center',
    width: ICON_SLOT
  },
  iconCenter: { alignItems: 'center', justifyContent: 'center' },
  passThrough: { pointerEvents: 'box-none' },
  target: {
    height: TARGET,
    left: 0,
    position: 'absolute',
    top: 0,
    width: TARGET
  }
})
