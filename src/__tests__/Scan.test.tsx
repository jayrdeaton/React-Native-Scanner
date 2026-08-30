import { fireEvent, render } from '@testing-library/react'
import { Animated } from 'react-native'

import { Scan } from '../Scan'
import type { BarcodeScanResult, ScannerPaperModule } from '../types'

const scan: BarcodeScanResult = { data: '12345', type: 'QR' }

const animatedProps = {
  check: new Animated.Value(0),
  height: new Animated.Value(0),
  origin: new Animated.ValueXY(),
  width: new Animated.Value(0)
}

const paper: ScannerPaperModule = {
  IconButton: ({ icon }: { icon: unknown }) => <>{`paper-icon:${typeof icon === 'string' ? icon : 'custom'}`}</>
}

describe('Scan', () => {
  it('renders the plain fallback dot when paper is not injected', () => {
    const { container } = render(<Scan {...animatedProps} color='#6200ee' onPress={jest.fn()} scan={scan} scanIcon='qrcode' />)
    expect(container.textContent).not.toContain('paper-icon')
  })

  it('renders through the injected paper IconButton for a string scanIcon', () => {
    const { container } = render(<Scan {...animatedProps} color='#6200ee' onPress={jest.fn()} paper={paper} scan={scan} scanIcon='qrcode' />)
    expect(container.textContent).toContain('paper-icon:qrcode')
  })

  it('renders through the injected paper IconButton for a string scannedIcon', () => {
    const { container } = render(<Scan {...animatedProps} color='#6200ee' onPress={jest.fn()} paper={paper} scan={scan} scannedIcon='check' />)
    expect(container.textContent).toContain('paper-icon:check')
  })

  it('prefers a custom icon render function over the injected paper module', () => {
    const customIcon = () => <>custom-icon</>
    const { container } = render(<Scan {...animatedProps} color='#6200ee' onPress={jest.fn()} paper={paper} scan={scan} scanIcon={customIcon} scannedIcon={customIcon} />)
    expect(container.textContent).toContain('custom-icon')
    expect(container.textContent).not.toContain('paper-icon')
  })

  it('calls onPress with the scan when the touchable is pressed', () => {
    const onPressMock = jest.fn()
    const { container } = render(<Scan {...animatedProps} color='#6200ee' onPress={onPressMock} scan={scan} scanIcon='qrcode' />)

    const touchables = container.querySelectorAll('div')
    expect(touchables.length).toBe(1)
    const touchable = touchables[0]
    expect(touchable).not.toBeNull()

    fireEvent.click(touchable)

    expect(onPressMock).toHaveBeenCalledWith(scan)
  })
})
