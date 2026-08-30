import type { ReactNode } from 'react'

export const GestureHandlerRootView = ({ children }: { children?: ReactNode }) => children ?? null
export const GestureDetector = ({ children }: { children?: ReactNode }) => children ?? null

type GestureHandler = {
  onBegin: (fn: unknown) => GestureHandler
  onEnd: (fn: () => void) => GestureHandler
  onUpdate: (fn: (event: unknown) => void) => GestureHandler
  _onEnd?: () => void
  _onUpdate?: (event: unknown) => void
}

const createGestureHandler = (): GestureHandler => {
  const handler: GestureHandler = {
    onBegin: (_fn) => handler,
    onEnd: (fn) => {
      handler._onEnd = fn
      return handler
    },
    onUpdate: (fn) => {
      handler._onUpdate = fn
      return handler
    }
  }
  return handler
}

export const Gesture = {
  Pan: jest.fn(createGestureHandler),
  Pinch: jest.fn(createGestureHandler)
}
