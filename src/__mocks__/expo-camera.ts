import type { ReactNode } from 'react'

export const CameraView = jest.fn(({ children }: { children?: ReactNode }) => children ?? null)

export const useCameraPermissions = () => [{ granted: true, canAskAgain: false }, jest.fn()]
