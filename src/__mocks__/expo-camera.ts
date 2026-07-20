import type { ReactNode } from 'react'

export const CameraView = ({ children }: { children?: ReactNode }) => children ?? null

export const useCameraPermissions = () => [{ granted: true, canAskAgain: false }, jest.fn()]
