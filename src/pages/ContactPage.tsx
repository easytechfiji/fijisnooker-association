import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { isCurrent, sortCommittee } from '../lib/committee.ts'
import { todayInFiji } from '../lib/format.ts'
import type { CommitteeMember } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

export function ContactPage() {
  const { data, error, loading } = useSupabaseQuery<CommitteeMember[]>(
    () => supabase.from('committee_members').select('*'),
    'committee-contacts',
  )

  const today = todayInFiji()

  return (
    <>
      <PageHeader
        title="Contact"
        description="Get in touch with the association's office bearers."
      />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
            <span className="rule" aria-hidden="true" />
            Who to contact
          </h2>

          <QueryBoundary loading={loading} error={error} data={data}>
            {(members) => {
              const contactable = sortCommittee(
                members.filter(
                  (member) =>
                    isCurrent(member, today) &&
                    (member.contact_email || member.contact_phone),
                ),
              )

              if (contactable.length === 0) {
                return (
                  <EmptyState message="No contact details are published yet. They appear here once committee members with an email or phone number are added." />
                )
              }

              return (
                <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
                  {contactable.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3.5"
                    >
                      <div>
                        <p className="font-semibold text-crimson-800">{member.role}</p>
                        <p className="text-sm text-stone-500">{member.name}</p>
                      </div>
                      <div className="text-sm">
                        {member.contact_email ? (
                          <p>
                            <a href={`mailto:${member.contact_email}`} className="link">
                              {member.contact_email}
                            </a>
                          </p>
                        ) : null}
                        {member.contact_phone ? (
                          <p className="text-stone-600">
                            <a
                              href={`tel:${member.contact_phone.replace(/\s+/g, '')}`}
                              className="hover:text-crimson-700"
                            >
                              {member.contact_phone}
                            </a>
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }}
          </QueryBoundary>

          {/*
            No contact form here on purpose. Sending mail needs a server-side
            credential for an email provider, and this app is a static build
            talking to Supabase with a public key — there is nowhere to keep
            that secret. A form would also be an open relay for spam without a
            captcha. If the association wants one, it belongs in the small
            Node.js service PROJECT_PLAN.md sets aside for notifications.
          */}
          <p className="mt-6 text-sm text-stone-500">
            Email is the most reliable way to reach the committee. For results,
            corrections or anything that should appear on this site, contact the
            secretary.
          </p>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/80">
            <h2 className="text-base">Submitting results</h2>
            <p className="mt-2 text-sm text-stone-600">
              Match results and tournament details are entered by the committee.
              Send scorecards to the secretary and they will appear under{' '}
              <Link
                to="/tournaments"
                className="link"
              >
                tournaments
              </Link>{' '}
              and in the{' '}
              <Link
                to="/rankings"
                className="link"
              >
                rankings
              </Link>
              .
            </p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/80">
            <h2 className="text-base">Committee</h2>
            <p className="mt-2 text-sm text-stone-600">
              The full list of office bearers, including past terms, is on the{' '}
              <Link
                to="/committee"
                className="link"
              >
                committee page
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
