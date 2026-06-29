import { useEffect, useState } from 'react'

function computeViewportState({
  desktopBreakpoint = 900,
  compactWidth = 375,
  compactHeight = 740,
  desktopLabel = 'desktop',
  regularLabel = 'regular',
  compactLabel = 'compact',
} = {}) {
  if (typeof window === 'undefined') {
    return {
      mode: desktopLabel,
      isDesktop: true,
      isCompact: false,
      isMobile: false,
      width: 0,
      height: 0,
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const isDesktop = width > desktopBreakpoint
  const isCompact = !isDesktop && (width <= compactWidth || height <= compactHeight)
  const mode = isDesktop ? desktopLabel : isCompact ? compactLabel : regularLabel

  return {
    mode,
    isDesktop,
    isCompact,
    isMobile: width <= desktopBreakpoint,
    width,
    height,
  }
}

export function useViewportState(config = {}) {
  const {
    desktopBreakpoint = 900,
    compactWidth = 375,
    compactHeight = 740,
    desktopLabel = 'desktop',
    regularLabel = 'regular',
    compactLabel = 'compact',
  } = config

  const [viewportState, setViewportState] = useState(() =>
    computeViewportState({
      desktopBreakpoint,
      compactWidth,
      compactHeight,
      desktopLabel,
      regularLabel,
      compactLabel,
    }),
  )

  useEffect(() => {
    function handleViewportChange() {
      setViewportState(
        computeViewportState({
          desktopBreakpoint,
          compactWidth,
          compactHeight,
          desktopLabel,
          regularLabel,
          compactLabel,
        }),
      )
    }

    handleViewportChange()
    window.addEventListener('resize', handleViewportChange)

    return () => window.removeEventListener('resize', handleViewportChange)
  }, [compactHeight, compactLabel, compactWidth, desktopBreakpoint, desktopLabel, regularLabel])

  return viewportState
}
