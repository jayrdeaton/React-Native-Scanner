/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useCallback } from 'react'
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Bounds } from './Bounds'
import type { BarcodeScanResult, IconSource, ScannerPaperModule } from './types'

const ICON_SIZE = 30

const resolveIcon = (icon: IconSource): any => {
  if (typeof icon === 'function') return icon({ color: 'white', size: ICON_SIZE })
  return icon
}

export type ScanProps = {
  check: Animated.Value
  color: string
  height: Animated.Value
  onPress: (scan: BarcodeScanResult) => void
  origin: Animated.ValueXY
  paper?: ScannerPaperModule
  scan: BarcodeScanResult
  scanIcon?: IconSource
  scannedIcon?: IconSource
  width: Animated.Value
}

function ScanComponent({ check, color, height, onPress, origin, paper, scan, scanIcon, scannedIcon, width }: ScanProps) {
  const handlePress = useCallback(() => onPress(scan), [onPress, scan])

  const scanOpacity = check.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  const checkOpacity = check.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  const iconStyle = [styles.absolute, styles.iconSlot]

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

  return (
    <Animated.View style={[styles.absolute, { top: origin.y, left: origin.x, height, width }]}>
      <TouchableOpacity style={[StyleSheet.absoluteFill, styles.touchable]} onPress={handlePress}>
        <Bounds color={color} />
        <View style={styles.iconRow}>
          <Animated.View style={[iconStyle, { opacity: scanOpacity }]}>{scanIndicator}</Animated.View>
          <Animated.View style={[iconStyle, { opacity: checkOpacity }]}>{checkIndicator}</Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export const Scan = memo(ScanComponent)

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
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
  iconButton: {
    alignItems: 'center',
    height: ICON_SIZE + 8,
    justifyContent: 'center',
    width: ICON_SIZE + 8
  },
  iconCenter: { alignItems: 'center', justifyContent: 'center' },
  iconRow: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: '100%'
  },
  iconSlot: {
    alignItems: 'center',
    height: ICON_SIZE + 8,
    justifyContent: 'center',
    width: ICON_SIZE + 8
  },
  touchable: { alignItems: 'center', flexDirection: 'row' }
})
