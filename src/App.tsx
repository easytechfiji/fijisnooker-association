import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ConfigGate } from './components/ConfigGate.tsx'
import { Layout } from './components/Layout.tsx'
import { Spinner } from './components/ui/Spinner.tsx'

import { HomePage } from './pages/HomePage.tsx'
import { NewsPostPage } from './pages/NewsPostPage.tsx'
import { TournamentsPage } from './pages/TournamentsPage.tsx'
import { TournamentPage } from './pages/TournamentPage.tsx'
import { PlayersPage } from './pages/PlayersPage.tsx'
import { PlayerPage } from './pages/PlayerPage.tsx'
import { RankingsPage } from './pages/RankingsPage.tsx'
import { CalendarPage } from './pages/CalendarPage.tsx'
import { AboutPage } from './pages/AboutPage.tsx'
import { CommitteePage } from './pages/CommitteePage.tsx'
import { ContactPage } from './pages/ContactPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

/*
 * The admin panel is loaded on demand. Most visitors are here to read results
 * and will never sign in, so its forms, validation and editing UI have no
 * business in the bundle they download. Everything below `admin/` sits behind
 * one Suspense boundary, which also covers the lazily-loaded Markdown renderer
 * used by the news preview.
 */
const LoginPage = lazy(() => import('./admin/LoginPage.tsx'))
const RequireAdmin = lazy(() => import('./auth/RequireAdmin.tsx'))
const AdminLayout = lazy(() => import('./admin/AdminLayout.tsx'))
const DashboardPage = lazy(() => import('./admin/DashboardPage.tsx'))
const AdminTournamentsPage = lazy(() => import('./admin/TournamentsPage.tsx'))
const AdminMatchesPage = lazy(() => import('./admin/MatchesPage.tsx'))
const AdminPlayersPage = lazy(() => import('./admin/PlayersPage.tsx'))
const AdminClubsPage = lazy(() => import('./admin/ClubsPage.tsx'))
const AdminNewsPage = lazy(() => import('./admin/NewsPage.tsx'))
const AdminCommitteePage = lazy(() => import('./admin/CommitteePage.tsx'))
const AdminEventsPage = lazy(() => import('./admin/EventsPage.tsx'))
const AdminMediaPage = lazy(() => import('./admin/MediaPage.tsx'))

function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Spinner />
    </div>
  )
}

export default function App() {
  return (
    <ConfigGate>
      <Routes>
        {/* Public site */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="news/:slug" element={<NewsPostPage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="tournaments/:id" element={<TournamentPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="players/:id" element={<PlayerPage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="committee" element={<CommitteePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Login sits outside the gate it guards. */}
        <Route
          path="admin/login"
          element={
            <Suspense fallback={<Loading />}>
              <LoginPage />
            </Suspense>
          }
        />

        {/* Everything below requires a session with a row in `admins`. */}
        <Route
          path="admin"
          element={
            <Suspense fallback={<Loading />}>
              <RequireAdmin />
            </Suspense>
          }
        >
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="tournaments" element={<AdminTournamentsPage />} />
            <Route path="matches" element={<AdminMatchesPage />} />
            <Route path="players" element={<AdminPlayersPage />} />
            <Route path="clubs" element={<AdminClubsPage />} />
            <Route path="news" element={<AdminNewsPage />} />
            <Route path="committee" element={<AdminCommitteePage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="media" element={<AdminMediaPage />} />
          </Route>
        </Route>
      </Routes>
    </ConfigGate>
  )
}
