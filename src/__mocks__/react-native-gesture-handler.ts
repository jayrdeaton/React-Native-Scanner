import type { ReactNode } from 'react'

export const GestureHandlerRootView = ({ children }: { children?: ReactNode }) => children ?? null
export const GestureDetector = ({ children }: { children?: ReactNode }) => children ?? null

const noopHandler = {
  onBegin: (_fn: unknown) => noopHandler,
  onEnd: (_fn: unknown) => noopHandler,
  onUpdate: (_fn: unknown) => noopHandler
}

export const Gesture = {
  Pan: () => noopHandler,
  Pinch: () => noopHandler
}
