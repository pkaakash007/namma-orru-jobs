import React, { useState, useEffect, useRef, useCallback } from 'react'
import { RotateCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  isRefreshing: boolean
  children: React.ReactNode
  pullThreshold?: number
  disabled?: boolean
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing,
  children,
  pullThreshold = 65,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startYRef = useRef<number | null>(null)
  const isEligibleRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return
      // Only initiate pull-to-refresh if page is scrolled to top
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0
      if (scrollY <= 2) {
        startYRef.current = e.touches[0].clientY
        isEligibleRef.current = true
      } else {
        isEligibleRef.current = false
      }
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isEligibleRef.current || startYRef.current === null || isRefreshing) return

      const currentY = e.touches[0].clientY
      const deltaY = currentY - startYRef.current

      // Only respond to downward pulls from top
      if (deltaY > 0) {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0
        if (scrollY <= 2) {
          // Logarithmic resistance curve for authentic iOS/Android feel
          const dampedDistance = Math.min(Math.pow(deltaY, 0.85) * 1.5, 95)
          setPullDistance(dampedDistance)
          setIsPulling(true)

          // Prevent native browser rubber-banding if dragging down
          if (deltaY > 10 && e.cancelable) {
            e.preventDefault()
          }
        } else {
          isEligibleRef.current = false
          setPullDistance(0)
          setIsPulling(false)
        }
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }
    },
    [isRefreshing]
  )

  const handleTouchEnd = useCallback(() => {
    if (!isEligibleRef.current) return
    isEligibleRef.current = false
    startYRef.current = null

    if (pullDistance >= pullThreshold && !isRefreshing) {
      // Gentle haptic feedback if supported by device
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(12)
        }
      } catch {}

      onRefresh()
    }

    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, pullThreshold, isRefreshing, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const opts: AddEventListenerOptions = { passive: false }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, opts)
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const showIndicator = isPulling || isRefreshing || pullDistance > 0
  const progressRatio = Math.min(pullDistance / pullThreshold, 1)
  const isTriggerReady = pullDistance >= pullThreshold

  return (
    <div ref={containerRef} className="relative w-full min-h-screen">
      {/* Pull-to-refresh floating indicator pill */}
      <div
        className={`pointer-events-none fixed top-16 left-0 right-0 z-30 flex justify-center transition-all duration-200 ${
          showIndicator ? 'opacity-100' : 'opacity-0 -translate-y-4'
        }`}
        style={{
          transform: isRefreshing
            ? 'translateY(12px)'
            : isPulling
            ? `translateY(${Math.min(pullDistance * 0.7, 48)}px)`
            : 'translateY(-16px)',
        }}
      >
        <div
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-md border backdrop-blur-md transition-colors ${
            isTriggerReady || isRefreshing
              ? 'bg-[#0B2545] border-[#0B2545] text-white'
              : 'bg-white/95 border-slate-200/90 text-slate-700'
          }`}
        >
          <RotateCw
            className={`h-4 w-4 shrink-0 transition-transform ${
              isRefreshing
                ? 'animate-spin text-[#F97316]'
                : isTriggerReady
                ? 'text-[#F97316]'
                : 'text-[#0B2545]'
            }`}
            style={
              !isRefreshing
                ? { transform: `rotate(${progressRatio * 270}deg)` }
                : undefined
            }
          />
          <span className="text-xs font-semibold tracking-tight">
            {isRefreshing
              ? 'Refreshing...'
              : isTriggerReady
              ? 'Release to refresh'
              : 'Pull down to refresh'}
          </span>
        </div>
      </div>

      {/* Main page content */}
      <div
        style={{
          transform:
            isPulling && pullDistance > 0
              ? `translateY(${pullDistance * 0.25}px)`
              : undefined,
          transition: isPulling ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
