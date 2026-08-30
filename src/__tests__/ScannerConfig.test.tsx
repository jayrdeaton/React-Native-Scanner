import { render } from '@testing-library/react'

import { Scanner } from '../Scanner'
import { configureScanner, getScannerConfig, ScannerProvider } from '../ScannerConfig'
import type { SafeAreaModule } from '../types'

const fakeSafeArea: SafeAreaModule = { useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }) }
const onScan = jest.fn()

describe('configureScanner / getScannerConfig', () => {
  it('is readable via the bare function, without any Provider', () => {
    configureScanner({ safeArea: fakeSafeArea })
    expect(getScannerConfig().safeArea).toBe(fakeSafeArea)
  })

  it('merges partial updates instead of replacing the whole config', () => {
    configureScanner({ safeArea: fakeSafeArea })
    configureScanner({})
    expect(getScannerConfig().safeArea).toBe(fakeSafeArea)
  })

  it('is picked up by <Scanner> as the default safeArea, without passing it per-instance', () => {
    configureScanner({ safeArea: fakeSafeArea })
    expect(() => render(<Scanner onScan={onScan} />)).not.toThrow()
  })
})

describe('ScannerProvider', () => {
  it('calls configureScanner() synchronously during render, before children render', () => {
    let seenDuringChildRender: SafeAreaModule | undefined
    const Probe = () => {
      seenDuringChildRender = getScannerConfig().safeArea
      return null
    }

    render(
      <ScannerProvider safeArea={fakeSafeArea}>
        <Probe />
      </ScannerProvider>
    )

    expect(seenDuringChildRender).toBe(fakeSafeArea)
  })
})
