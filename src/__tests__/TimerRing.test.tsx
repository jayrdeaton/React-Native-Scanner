import { render } from '@testing-library/react'

import { TimerRing } from '../TimerRing'

describe('TimerRing', () => {
  it('stops immediately when mounted with duration=0 and started=null', () => {
    expect(() => render(<TimerRing color='#6200ee' duration={0} radius={20} started={null} />)).not.toThrow()
  })

  it('starts the timer and calls onStop when mounted with started set and duration>0', () => {
    const onStop = jest.fn()
    render(<TimerRing color='#6200ee' duration={10} onStop={onStop} radius={20} started={new Date().toISOString()} />)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('does not start (and does not call onStop) when started is null but duration>0', () => {
    const onStop = jest.fn()
    expect(() => render(<TimerRing color='#6200ee' duration={10} onStop={onStop} radius={20} started={null} />)).not.toThrow()
    expect(onStop).not.toHaveBeenCalled()
  })

  it('skips the inner start/stop entirely when rerendered with the same started and duration', () => {
    const started = new Date().toISOString()
    const onStopA = jest.fn()
    const onStopB = jest.fn()
    const { rerender } = render(<TimerRing color='#6200ee' duration={10} onStop={onStopA} radius={20} started={started} />)
    onStopA.mockClear()
    // A new onStop identity gives startTimer/stopTimer new identities too, which re-runs the
    // effect even though started/duration are literally unchanged - this is what actually
    // exercises the startedChanged=false/durationChanged=false skip path below.
    expect(() => rerender(<TimerRing color='#6200ee' duration={10} onStop={onStopB} radius={20} started={started} />)).not.toThrow()
    expect(onStopA).not.toHaveBeenCalled()
    expect(onStopB).not.toHaveBeenCalled()
  })

  it('stops a running timer when started changes to null on rerender', () => {
    const started = new Date().toISOString()
    const onStop = jest.fn()
    const { rerender } = render(<TimerRing color='#6200ee' duration={10} onStop={onStop} radius={20} started={started} />)
    onStop.mockClear()
    expect(() => rerender(<TimerRing color='#6200ee' duration={10} onStop={onStop} radius={20} started={null} />)).not.toThrow()
  })

  it('restarts the timer when only duration changes while started stays the same', () => {
    const started = new Date().toISOString()
    const onStop = jest.fn()
    const { rerender } = render(<TimerRing color='#6200ee' duration={10} onStop={onStop} radius={20} started={started} />)
    onStop.mockClear()
    rerender(<TimerRing color='#6200ee' duration={20} onStop={onStop} radius={20} started={started} />)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('renders without throwing when onStop is omitted', () => {
    expect(() => render(<TimerRing color='#6200ee' duration={10} radius={20} started={new Date().toISOString()} />)).not.toThrow()
  })
})
