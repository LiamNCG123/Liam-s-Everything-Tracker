import { useState, useCallback } from 'react'

// Returns [isFlashing, triggerFlash]
// Active for `duration` ms after trigger() is called, then auto-clears.
export function useFlash(duration = 1500) {
  const [active, setActive] = useState(false)
  const trigger = useCallback(() => {
    setActive(true)
    setTimeout(() => setActive(false), duration)
  }, [duration])
  return [active, trigger]
}
