import type { ReactNode, Ref } from 'react'
import { useImperativeHandle } from 'react'

export const mockTakePictureAsync = jest.fn().mockResolvedValue({ uri: 'file://mock-photo.jpg', width: 100, height: 100 })

type CameraViewRef = { takePictureAsync: (options?: unknown) => Promise<unknown> }
type CameraViewProps = { children?: ReactNode; ref?: Ref<CameraViewRef> }

const CameraViewComponent = ({ children, ref }: CameraViewProps) => {
  useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePictureAsync }))
  return children ?? null
}

export const CameraView = jest.fn(CameraViewComponent)

export const useCameraPermissions = () => [{ granted: true, canAskAgain: false }, jest.fn()]
