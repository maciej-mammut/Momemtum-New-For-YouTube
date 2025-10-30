import { useEffect, useState } from "react"

export const useHasHydrated = (): boolean => {
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHasHydrated(true)
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return hasHydrated
}
