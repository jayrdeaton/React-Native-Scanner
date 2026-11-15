import { useMemo } from 'react'
import { Animated, StyleSheet } from 'react-native'

import { type Frame, place } from './place'

const CORNER = 20

export type BoundsProps = Frame & {
  color: string
}

// Four corner brackets around a code's box, each moved into place on its own
export const Bounds = ({ color, height, origin, width }: BoundsProps) => {
  const corners = useMemo(() => {
    const frame = { height, origin, width }
    return { bottomLeft: place(frame, 0, 1, CORNER), bottomRight: place(frame, 1, 1, CORNER), topLeft: place(frame, 0, 0, CORNER), topRight: place(frame, 1, 0, CORNER) }
  }, [height, origin, width])
  return (
    <>
      <Animated.View pointerEvents='none' style={[styles.corner, styles.topLeft, { borderColor: color, transform: corners.topLeft }]} />
      <Animated.View pointerEvents='none' style={[styles.corner, styles.topRight, { borderColor: color, transform: corners.topRight }]} />
      <Animated.View pointerEvents='none' style={[styles.corner, styles.bottomLeft, { borderColor: color, transform: corners.bottomLeft }]} />
      <Animated.View pointerEvents='none' style={[styles.corner, styles.bottomRight, { borderColor: color, transform: corners.bottomRight }]} />
    </>
  )
}

const styles = StyleSheet.create({
  bottomLeft: {
    borderBottomLeftRadius: 5,
    borderBottomWidth: 4,
    borderLeftWidth: 4
  },
  bottomRight: {
    borderBottomRightRadius: 5,
    borderBottomWidth: 4,
    borderRightWidth: 4
  },
  corner: {
    height: CORNER,
    left: 0,
    position: 'absolute',
    top: 0,
    width: CORNER
  },
  topLeft: {
    borderLeftWidth: 4,
    borderTopLeftRadius: 5,
    borderTopWidth: 4
  },
  topRight: {
    borderRightWidth: 4,
    borderTopRightRadius: 5,
    borderTopWidth: 4
  }
})
