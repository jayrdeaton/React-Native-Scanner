/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ReactNode } from 'react'

const stub = ({ children }: { children?: ReactNode }) => children ?? null

const noop = () => {}

class AnimatedValue {
  constructor(_v: number) {}
  setValue(_v: number) {}
  stopAnimation(cb?: () => void) {
    cb?.()
  }
  interpolate(_config: unknown) {
    return {}
  }
}

class AnimatedValueXY {
  x = new AnimatedValue(0)
  y = new AnimatedValue(0)
  constructor(_v?: { x: number; y: number }) {}
  stopAnimation() {}
}

const animatedObj = {
  start: (cb?: ({ finished }: { finished: boolean }) => void) => {
    cb?.({ finished: true })
  },
  stop: noop,
  reset: noop
}

const Animated = {
  Value: AnimatedValue,
  ValueXY: AnimatedValueXY,
  createAnimatedComponent: <T>(C: T): T => C,
  timing: (_value: unknown, _config: unknown) => animatedObj,
  spring: (_value: unknown, _config: unknown) => animatedObj,
  parallel: (_anims: unknown[]) => animatedObj,
  sequence: (_anims: unknown[]) => animatedObj,
  View: stub
}

const Easing = {
  linear: (t: number) => t
}

const StyleSheet = {
  absoluteFill: {},
  create: <T extends object>(styles: T): T => styles,
  flatten: (style: unknown) => style
}

const Platform = {
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default
}

export { Animated, Easing, Platform, StyleSheet }

export const View = stub
export const Text = stub
export const Pressable = stub
export const TouchableOpacity = stub
