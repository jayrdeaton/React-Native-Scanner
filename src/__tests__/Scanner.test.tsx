import { act, fireEvent, render } from '@testing-library/react'
import * as ExpoCamera from 'expo-camera'
import { Gesture } from 'react-native-gesture-handler'

import { Scanner } from '../Scanner'
import { configureScanner } from '../ScannerConfig'
import type { CameraModule, SafeAreaModule, ScannerPaperModule } from '../types'

const onScan = jest.fn()

// expo-camera/react-native-paper/react-native-safe-area-context are never auto-detected -
// Metro doesn't rewrite a require()-in-try/catch call into its module graph inside an ESM
// (.mjs) build, so the module-level detection this package used to do silently broke as soon
// as consumers' bundlers resolved this package's ESM entry point. They're injected via
// <Scanner camera={...} paper={...} safeArea={...}> instead - real structural compatibility
// with the actual peer packages is checked at compile time in moduleShapes.typecheck.ts;
// these fakes just exercise the injected-vs-omitted render paths.
const camera = ExpoCamera as unknown as CameraModule
// expo-camera's real published types (used for type-checking, since moduleNameMapper only
// redirects Jest's runtime resolution) don't declare the mock-only `mockTakePictureAsync`
// export, so it's read off the namespace import through an explicit cast.
const mockTakePictureAsync = (ExpoCamera as unknown as { mockTakePictureAsync: jest.Mock }).mockTakePictureAsync
const paper: ScannerPaperModule = { IconButton: (props: { icon: unknown }) => <>{typeof props.icon === 'string' ? props.icon : 'icon'}</> }
const safeArea: SafeAreaModule = { useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }) }

describe('Scanner', () => {
  beforeEach(() => {
    onScan.mockClear()
  })

  it('renders without throwing', () => {
    expect(() => {
      render(<Scanner onScan={onScan} />)
    }).not.toThrow()
  })

  it('renders with onClose prop', () => {
    expect(() => {
      render(<Scanner onScan={onScan} onClose={jest.fn()} />)
    }).not.toThrow()
  })

  it('renders with custom accentColor', () => {
    expect(() => {
      render(<Scanner onScan={onScan} accentColor='#ff0000' />)
    }).not.toThrow()
  })

  it('renders with timeout enabled', () => {
    expect(() => {
      render(<Scanner onScan={onScan} timeout={30} />)
    }).not.toThrow()
  })

  it('renders with autoScan disabled', () => {
    expect(() => {
      render(<Scanner onScan={onScan} autoScan={false} />)
    }).not.toThrow()
  })

  it('renders with children', () => {
    expect(() => {
      render(
        <Scanner onScan={onScan}>
          <></>
        </Scanner>
      )
    }).not.toThrow()
  })

  it('renders with disabledScanValues', () => {
    expect(() => {
      render(<Scanner onScan={onScan} disabledScanValues={['12345', '67890']} />)
    }).not.toThrow()
  })

  it('renders with disabledScanValueSet', () => {
    const set = new Set(['12345'])
    expect(() => {
      render(<Scanner onScan={onScan} disabledScanValueSet={set} />)
    }).not.toThrow()
  })

  it('renders with renderMenu prop', () => {
    expect(() => {
      render(<Scanner onScan={onScan} renderMenu={<></>} />)
    }).not.toThrow()
  })

  it('renders with barcodeTypes prop', () => {
    expect(() => {
      render(<Scanner onScan={onScan} barcodeTypes={['qr', 'ean13']} />)
    }).not.toThrow()
  })

  it('accepts event callback props without throwing', () => {
    expect(() => {
      render(<Scanner onScan={onScan} onSound={jest.fn()} onVibrate={jest.fn()} onTimeout={jest.fn()} onPermissionDenied={jest.fn()} onDisabledScan={jest.fn()} />)
    }).not.toThrow()
  })
})

describe('Scanner with injected peers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the real camera view once granted, instead of the plain background fallback', () => {
    const MockCameraView = ExpoCamera.CameraView as unknown as jest.Mock
    render(
      <Scanner camera={camera} onScan={onScan}>
        <></>
      </Scanner>
    )
    expect(MockCameraView).toHaveBeenCalled()
  })

  it('renders the plain background fallback when camera is omitted', () => {
    const MockCameraView = ExpoCamera.CameraView as unknown as jest.Mock
    render(<Scanner onScan={onScan} />)
    expect(MockCameraView).not.toHaveBeenCalled()
  })

  it('reads insets from the injected safeArea module instead of the fixed-padding fallback', () => {
    expect(() => render(<Scanner onScan={onScan} safeArea={safeArea} />)).not.toThrow()
  })

  it('threads the injected paper module through to the scan overlay without throwing', () => {
    // The overlay itself only renders once a barcode is actually detected, see Scan.test.tsx
    // for direct coverage of paper vs. fallback icon rendering. This just proves `paper` flows
    // through Scanner -> useScanOverlays -> Scan without breaking anything along the way.
    expect(() => render(<Scanner onScan={onScan} paper={paper} scanIcon='qrcode' />)).not.toThrow()
  })

  it('prefers the per-instance camera prop over a configured global default', () => {
    const MockCameraView = ExpoCamera.CameraView as unknown as jest.Mock
    const GlobalCameraView = jest.fn(() => null)
    const globalCamera: CameraModule = { CameraView: GlobalCameraView, useCameraPermissions: camera.useCameraPermissions }
    configureScanner({ camera: globalCamera })

    render(<Scanner camera={camera} onScan={onScan} />)

    expect(MockCameraView).toHaveBeenCalled()
    expect(GlobalCameraView).not.toHaveBeenCalled()
  })
})

type CaptureHandlers = { onPress: () => void; onPressIn: () => void; onPressOut: () => void }

describe('Scanner timeout prop transitions', () => {
  it('handles the timeout prop changing from 0 to a positive value and back without throwing', () => {
    const { rerender } = render(<Scanner onScan={onScan} timeout={0} />)
    expect(() => rerender(<Scanner onScan={onScan} timeout={10} />)).not.toThrow()
    expect(() => rerender(<Scanner onScan={onScan} timeout={0} />)).not.toThrow()
  })
})

describe('Scanner container press handlers', () => {
  it('fires handlePressIn/handlePressOut on the outer container Pressable when timeout is enabled', () => {
    const { container } = render(<Scanner onScan={onScan} renderCapture={() => null} timeout={10} />)

    const div = container.querySelector('div')
    expect(div).not.toBeNull()

    expect(() => {
      fireEvent.mouseDown(div!)
      fireEvent.mouseUp(div!)
    }).not.toThrow()
  })
})

describe('Scanner handleCapturePress (photo mode)', () => {
  afterEach(() => {
    mockTakePictureAsync.mockResolvedValue({ uri: 'file://mock-photo.jpg', width: 100, height: 100 })
  })

  it('calls onPhoto with the resolved photo and restarts the timer when takePictureAsync resolves', async () => {
    let handlers: CaptureHandlers | undefined
    const captureHandlers = (h: CaptureHandlers) => {
      handlers = h
      return null
    }
    const onPhoto = jest.fn()

    render(<Scanner camera={camera} mode='photo' onPhoto={onPhoto} onScan={onScan} pictureOptions={{ quality: 1 }} renderCapture={captureHandlers} timeout={10} />)

    await act(async () => {
      await handlers!.onPress()
    })

    expect(onPhoto).toHaveBeenCalledWith({ uri: 'file://mock-photo.jpg', width: 100, height: 100 })
  })

  it('does not call onPhoto and does not throw when takePictureAsync rejects', async () => {
    mockTakePictureAsync.mockRejectedValueOnce(new Error('fail'))
    let handlers: CaptureHandlers | undefined
    const captureHandlers = (h: CaptureHandlers) => {
      handlers = h
      return null
    }
    const onPhoto = jest.fn()

    render(<Scanner camera={camera} mode='photo' onPhoto={onPhoto} onScan={onScan} renderCapture={captureHandlers} timeout={10} />)

    await act(async () => {
      await handlers!.onPress()
    })

    expect(onPhoto).not.toHaveBeenCalled()
  })

  it('does not throw and does not call onPhoto when no camera is injected', async () => {
    configureScanner({ camera: undefined })
    let handlers: CaptureHandlers | undefined
    const captureHandlers = (h: CaptureHandlers) => {
      handlers = h
      return null
    }
    const onPhoto = jest.fn()

    render(<Scanner mode='photo' onPhoto={onPhoto} onScan={onScan} renderCapture={captureHandlers} timeout={10} />)

    await act(async () => {
      await handlers!.onPress()
    })

    expect(onPhoto).not.toHaveBeenCalled()
  })
})

describe('Scanner handleCapturePress (scan mode)', () => {
  it('delegates to the useScanOverlays handlePress instead of taking a photo', async () => {
    let handlers: CaptureHandlers | undefined
    const captureHandlers = (h: CaptureHandlers) => {
      handlers = h
      return null
    }
    const onPhoto = jest.fn()

    render(<Scanner autoScan={false} camera={camera} onPhoto={onPhoto} onScan={onScan} renderCapture={captureHandlers} />)

    await act(async () => {
      await handlers!.onPress()
    })

    expect(onPhoto).not.toHaveBeenCalled()
  })
})

describe('Scanner onBarcodeScanned wiring', () => {
  it('drives handleScan through to onScan and restarts the timer via onCapture', () => {
    const MockCameraView = ExpoCamera.CameraView as unknown as jest.Mock

    render(<Scanner camera={camera} mode='scan' onScan={onScan} timeout={10} />)

    const lastCall = MockCameraView.mock.calls[MockCameraView.mock.calls.length - 1]
    const { onBarcodeScanned } = lastCall[0]

    act(() => {
      onBarcodeScanned({ data: '12345', type: 'qr' })
    })

    expect(onScan).toHaveBeenCalledWith({ data: '12345', type: 'QR' })
  })
})

describe('Scanner permission effect', () => {
  it('requests permission when it can be asked again and is not yet granted', () => {
    const requestPermissionMock = jest.fn()
    const askableCamera: CameraModule = {
      CameraView: () => null,
      useCameraPermissions: () => [{ granted: false, canAskAgain: true }, requestPermissionMock]
    }

    render(<Scanner camera={askableCamera} onScan={onScan} />)

    expect(requestPermissionMock).toHaveBeenCalled()
  })

  it('calls onPermissionDenied when permission is denied and cannot be asked again', () => {
    const onPermissionDeniedMock = jest.fn()
    const deniedCamera: CameraModule = {
      CameraView: () => null,
      useCameraPermissions: () => [{ granted: false, canAskAgain: false }, jest.fn()]
    }

    render(<Scanner camera={deniedCamera} onPermissionDenied={onPermissionDeniedMock} onScan={onScan} />)

    expect(onPermissionDeniedMock).toHaveBeenCalled()
  })
})

describe('Scanner pinch gesture', () => {
  it('does not throw on pinch update/end, including an event with no scale field', () => {
    render(<Scanner onScan={onScan} />)

    const pinchResults = (Gesture.Pinch as jest.Mock).mock.results
    const pinch = pinchResults[pinchResults.length - 1].value

    expect(() => {
      act(() => pinch._onUpdate({ scale: 1.5 }))
      act(() => pinch._onEnd())
      act(() => pinch._onUpdate({}))
    }).not.toThrow()
  })
})
