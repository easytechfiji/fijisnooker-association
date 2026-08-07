import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar.tsx'
import { Footer } from './Footer.tsx'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
