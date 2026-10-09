import { useEffect, useRef } from 'react'

/** Reveal once on entry; content stays visible when motion or observation is unavailable. */
export function useScrollReveal() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = root.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!container || motion.matches || !('IntersectionObserver' in window)) return

    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'))
    const reveal = (element: HTMLElement) => {
      element.dataset.revealState = 'visible'
      observer.unobserve(element)
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })

    elements.forEach(element => {
      // Deep links should never hide content the visitor has already passed.
      if (element.getBoundingClientRect().bottom <= 0) return
      element.dataset.revealState = 'pending'
      observer.observe(element)
    })

    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      const element = event.target.closest<HTMLElement>('[data-reveal]')
      if (element && container.contains(element)) reveal(element)
    }
    const onMotionChange = () => {
      if (!motion.matches) return
      elements.forEach(reveal)
      observer.disconnect()
    }
    container.addEventListener('focusin', onFocus)
    motion.addEventListener('change', onMotionChange)

    return () => {
      observer.disconnect()
      container.removeEventListener('focusin', onFocus)
      motion.removeEventListener('change', onMotionChange)
      elements.forEach(element => delete element.dataset.revealState)
    }
  }, [])

  return root
}
