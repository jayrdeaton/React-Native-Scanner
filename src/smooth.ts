// A One Euro filter (Casiez, Roussel and Vogel, 2012): exponential smoothing whose strength follows how fast the value is
// changing. Nearly still, it smooths hard, so a code's box doesn't wobble with the camera's noise. Moving fast, it barely
// smooths, so the box keeps up.
export type Smoother = (value: number, seconds: number) => number

export type SmootherOptions = {
  // How much faster the smoothing lets go as the value speeds up, per unit per second
  beta: number
  // How hard it smooths a value that's still, in Hz: lower is steadier but slower to start moving
  minCutoff: number
  // How hard it smooths the speed it measures, in Hz
  speedCutoff?: number
}

// The share of the way to a new reading that `seconds` of smoothing at `cutoff` Hz moves
const share = (seconds: number, cutoff: number) => {
  const r = 2 * Math.PI * cutoff * seconds
  return r / (r + 1)
}

// Returns a smoother for one value. Give it each new reading with the seconds since the last one.
export const smoother = ({ beta, minCutoff, speedCutoff = 1 }: SmootherOptions): Smoother => {
  let value: number | undefined
  let speed = 0
  return (next, seconds) => {
    if (value === undefined) {
      value = next
      return value
    }
    if (seconds <= 0) return value
    speed += share(seconds, speedCutoff) * ((next - value) / seconds - speed)
    value += share(seconds, minCutoff + beta * Math.abs(speed)) * (next - value)
    return value
  }
}
