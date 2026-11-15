import { Animated } from 'react-native'

// A code's box, in the camera view's coordinates
export type Frame = {
  height: Animated.Value
  origin: Animated.ValueXY
  width: Animated.Value
}

const along = (start: Animated.Value, length: Animated.Value, fraction: number, size: number) => (fraction === 0 ? start : Animated.add(start, Animated.multiply(Animated.add(length, -size), fraction)))

// Moves a square of `size` along a code's box: 0 lines it up with the box's start edge, 1 with its end edge, and 0.5
// centers it. Translations only, since the native driver can animate a transform but not width, height, top or left.
export const place = ({ height, origin, width }: Frame, x: number, y: number, size: number) => [{ translateX: along(origin.x, width, x, size) }, { translateY: along(origin.y, height, y, size) }]
