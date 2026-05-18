/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'

const Animated = {
  View: ({ children }: { children?: React.ReactNode }) => children ?? null
}

export default Animated

export const useSharedValue = (init: any) => ({ value: init })
export const useAnimatedStyle = (fn: () => any) => fn()
export const runOnJS = (fn: any) => fn
export const withTiming = (toValue: any, _config?: any, callback?: any) => {
  callback?.()
  return toValue
}
export const withSpring = (x: any) => x
