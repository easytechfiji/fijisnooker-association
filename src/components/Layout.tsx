import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { NavBar } from './NavBar.tsx'
import { Footer } from './Footer.tsx'

export function Layout() {
  const { pathname } = useLocation()

  /* Client-side navigation keeps the scroll position; on a new page that
   * lands the reader halfway down an article they have not opened yet. */
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="page-bg flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-crimson-800 focus:shadow-lg"
      >
        Skip to content
      </a>

      <NavBar />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12"
      >
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
