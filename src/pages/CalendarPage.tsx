import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { formatDate, formatDateRange, todayInFiji } from '../lib/format.ts'
import {
  WEEKDAYS,
  datesInRange,
  monthGrid,
  monthLabel,
  shiftMonth,
} from '../lib/calendar.ts'
import type { AssociationEvent, Tournament } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

interface DayEntry {
  key: string
  label: string
  to?: string
  kind: 'event' | 'tournament'
}

interface CalendarData {
  events: AssociationEvent[]
  tournaments: Tournament[]
}

async function loadCalendar(): Promise<QueryResult<CalendarData>> {
  const [events, tournaments] = await Promise.all([
    supabase.from('events').select('*').order('event_date', { ascending: true }),
    supabase.from('tournaments').select('*').order('start_date', { ascending: true }),
  ])

  const failure = events.error ?? tournaments.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      events: events.data ?? [],
      tournaments: tournaments.data ?? [],
    } satisfies CalendarData,
    error: null,
  }
}

export function CalendarPage() {
  const { data, error, loading } = useSupabaseQuery(loadCalendar, 'calendar')

  const today = todayInFiji()
  const [year, setYear] = useState(() => Number(today.slice(0, 4)))
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1)

  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>()
    const push = (date: string, entry: DayEntry) => {
      const existing = map.get(date)
      if (existing) existing.push(entry)
      else map.set(date, [entry])
    }

    for (const tournament of data?.tournaments ?? []) {
      for (const date of datesInRange(tournament.start_date, tournament.end_date)) {
        push(date, {
          key: `t-${tournament.id}-${date}`,
          label: tournament.name,
          to: `/tournaments/${tournament.id}`,
          kind: 'tournament',
        })
      }
    }

    for (const event of data?.events ?? []) {
      push(event.event_date, {
        key: `e-${event.id}`,
        label: event.title,
        kind: 'event',
      })
    }

    return map
  }, [data])

  const squares = useMemo(() => monthGrid(year, month), [year, month])
  const label = monthLabel(year, month)

  function goToMonth(delta: number) {
    const next = shiftMonth(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  const upcoming = (data?.events ?? []).filter((event) => event.event_date >= today)

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Fixtures, meetings and tournament dates for the association."
      />

      <QueryBoundary loading={loading} error={error} data={data}>
        {({ events, tournaments }) => (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-stone-300 ring-inset transition hover:text-baize-700 hover:ring-baize-400"
              >
                <span aria-hidden="true">←</span>
                <span className="ml-1.5 hidden sm:inline">Previous</span>
              </button>
              <h2 className="text-xl">{label}</h2>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="Next month"
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-stone-300 ring-inset transition hover:text-baize-700 hover:ring-baize-400"
              >
                <span className="mr-1.5 hidden sm:inline">Next</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {events.length === 0 && tournaments.length === 0 ? (
              <EmptyState message="Nothing on the calendar yet. Events and tournaments added in the admin panel appear here." />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
                  <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-semibold tracking-wide text-stone-500 uppercase">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {squares.map((date, index) => {
                      const entries = date ? (byDate.get(date) ?? []) : []
                      const isToday = date === today

                      return (
                        <div
                          key={date ?? `pad-${index}`}
                          className={`min-h-24 border-r border-b border-stone-100 p-1.5 last:border-r-0 ${
                            date ? '' : 'bg-stone-50/60'
                          } ${isToday ? 'bg-brass-100/60' : ''}`}
                        >
                          {date ? (
                            <>
                              <span
                                className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                                  isToday
                                    ? 'bg-baize-600 font-bold text-white'
                                    : 'text-stone-500'
                                }`}
                              >
                                {Number(date.slice(8, 10))}
                              </span>
                              <ul className="mt-1 space-y-1">
                                {entries.map((entry) => {
                                  const classes = `block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight font-medium ${
                                    entry.kind === 'tournament'
                                      ? 'bg-baize-100 text-baize-800'
                                      : 'bg-ocean-100 text-ocean-600'
                                  }`
                                  return (
                                    <li key={entry.key}>
                                      {entry.to ? (
                                        <Link
                                          to={entry.to}
                                          title={entry.label}
                                          className={`${classes} hover:underline`}
                                        >
                                          {entry.label}
                                        </Link>
                                      ) : (
                                        <span title={entry.label} className={classes}>
                                          {entry.label}
                                        </span>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            </>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 flex gap-5 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-baize-100 ring-1 ring-baize-300" />{' '}
                    Tournament
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-ocean-100 ring-1 ring-ocean-300" />{' '}
                    Event
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm bg-brass-100 ring-1 ring-brass-400" />{' '}
                    Today
                  </span>
                </div>

                <section className="mt-12">
                  <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                    <span className="rule" aria-hidden="true" />
                    Upcoming events
                  </h2>
                  {upcoming.length === 0 ? (
                    <EmptyState message="No events scheduled." />
                  ) : (
                    <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
                      {upcoming.map((event) => (
                        <li key={event.id} className="px-4 py-3.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-base">{event.title}</h3>
                            <time
                              dateTime={event.event_date}
                              className="text-sm text-stone-500"
                            >
                              {formatDate(event.event_date)}
                            </time>
                          </div>
                          {event.location ? (
                            <p className="text-sm text-stone-500">{event.location}</p>
                          ) : null}
                          {event.description ? (
                            <p className="mt-1 text-sm text-stone-600">
                              {event.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="mt-12">
                  <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                    <span className="rule" aria-hidden="true" />
                    Tournament dates
                  </h2>
                  <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
                    {tournaments.map((tournament) => (
                      <li key={tournament.id} className="px-4 py-3.5 transition-colors hover:bg-stone-50">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <Link
                            to={`/tournaments/${tournament.id}`}
                            className="font-medium text-stone-800 hover:text-baize-700 hover:underline"
                          >
                            {tournament.name}
                          </Link>
                          <span className="text-sm text-stone-500">
                            {formatDateRange(tournament.start_date, tournament.end_date)}
                          </span>
                        </div>
                        {tournament.venue ? (
                          <p className="text-sm text-stone-500">{tournament.venue}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </>
        )}
      </QueryBoundary>
    </>
  )
}
