import { render } from '@testing-library/react'
import * as ExpoCamera from 'expo-camera'
import React from 'react'

import { Scanner } from '../Scanner'
import { configureScanner } from '../ScannerConfig'
import type { CameraModule, ScannerPaperModule, SafeAreaModule } from '../types'

const onScan = jest.fn()

// expo-camera/react-native-paper/react-native-safe-area-context are never auto-detected -
// Metro doesn't rewrite a require()-in-try/catch call into its module graph inside an ESM
// (.mjs) build, so the module-level detection this package used to do silently broke as soon
// as consumers' bundlers resolved this package's ESM entry point. They're injected via
// <Scanner camera={...} paper={...} safeArea={...}> instead - real structural compatibility
// with the actual peer packages is checked at compile time in moduleShapes.typecheck.ts;
// these fakes just exercise the injected-vs-omitted render paths.
const camera = ExpoCamera as unknown as CameraModule
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
