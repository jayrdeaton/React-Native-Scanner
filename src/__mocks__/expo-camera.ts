import React from 'react'

export const CameraView = ({ children }: { children?: React.ReactNode }) => children ?? null

export const useCameraPermissions = () => [{ granted: true, canAskAgain: false }, jest.fn()]
