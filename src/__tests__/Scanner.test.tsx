import { render } from '@testing-library/react'
import React from 'react'

import { Scanner } from '../Scanner'

const onScan = jest.fn()

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
      render(<Scanner onScan={onScan} renderMenu={() => <></>} />)
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
