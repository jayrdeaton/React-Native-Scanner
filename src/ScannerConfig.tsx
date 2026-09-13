import { createModuleConfig } from '@rific/core'
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

// @rific/core's createModuleConfig() supplies the module-level config singleton (configure/
// getConfig/Provider) every @rific package wires up the same way - see its own doc comment for
// why this is plain module state rather than React Context. Per-instance camera/paper/safeArea
// props on <Scanner> always override this default.
const scannerConfig = createModuleConfig<ScannerConfig>()

export const configureScanner = scannerConfig.configure
export const getScannerConfig = scannerConfig.getConfig
export const ScannerProvider = scannerConfig.Provider

export type ScannerProviderProps = ScannerConfig & { children: ReactNode }
