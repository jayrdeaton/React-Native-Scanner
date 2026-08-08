import type { ReactNode } from 'react'

import type { CameraModule, SafeAreaModule, ScannerPaperModule } from './types'

export type ScannerConfig = {
  /** Injects expo-camera for the live camera feed and permission handling. Pass `import * as ExpoCamera from 'expo-camera'`; omit to render a plain colored view with no camera. */
  camera?: CameraModule
  /** Injects react-native-paper so the scan-overlay icon buttons render as real Paper `IconButton`s. Pass `import * as RNPaper from 'react-native-paper'`; omit to keep the plain fallback dot. */
  paper?: ScannerPaperModule
  /** Injects react-native-safe-area-context for real device inset handling. Pass `import * as SafeAreaContext from 'react-native-safe-area-context'`; omit to fall back to a fixed iOS-style top padding. */
  safeArea?: SafeAreaModule
}

let config: ScannerConfig = {}

// Plain module-level config rather than React Context: this is one-time app setup, not
// per-render reactive state, so a Provider that has to exist just to thread a value through the
// tree is more ceremony than the problem needs. Call this directly, or mount
// <ScannerProvider> once near your app root (it just calls this for you). Not reactive:
// calling it again after components have already rendered won't retroactively update them,
// fine for one-time startup config, not for runtime toggling. Per-instance `camera`/`paper`/
// `safeArea` props on <Scanner> always override this default.
export const configureScanner = (next: ScannerConfig) => {
  config = { ...config, ...next }
}

export const getScannerConfig = (): ScannerConfig => config

export type ScannerProviderProps = ScannerConfig & { children: ReactNode }

// Thin wrapper around configureScanner() for consumers who'd rather mount a Provider than call
// a setup function directly: every @rific package wires up the same way this way. Calls
// configureScanner() synchronously during render (not in an effect), so the config is already
// set by the time any descendant <Scanner> renders. Effects run bottom-up after children have
// already rendered once, which would be one render too late here.
export const ScannerProvider = ({ camera, children, paper, safeArea }: ScannerProviderProps) => {
  configureScanner({ camera, paper, safeArea })
  return <>{children}</>
}
