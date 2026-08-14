import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { isCurrent, sortCommittee } from '../lib/committee.ts'
import { formatDate, initials, todayInFiji } from '../lib/format.ts'
import { ASSOCIATION_NAME } from '../lib/brand.ts'
import type { CommitteeMember } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

function term(member: CommitteeMember): string | null {
  if (!member.term_start && !member.term_end) return null
  if (member.term_start && member.term_end) {
    return `${formatDate(member.term_start)} – ${formatDate(member.term_end)}`
  }
  if (member.term_start) return `From ${formatDate(member.term_start)}`
  return `Until ${formatDate(member.term_end)}`
}

function MemberCard({ member }: { member: CommitteeMember }) {
  const period = term(member)

  return (
    <li className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/80 transition duration-200 hover:shadow-md hover:ring-baize-300">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-baize-50 text-sm font-bold text-baize-700 ring-1 ring-baize-200"
        >
          {initials(member.name)}
        </span>
        <div className="min-w-0">
          <h3 className="text-base">{member.name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-brass-700">{member.role}</p>
          {period ? <p className="mt-1 text-xs text-stone-500">{period}</p> : null}

          <div className="mt-2 space-y-0.5 text-sm">
            {member.contact_email ? (
              <p className="truncate">
                <a href={`mailto:${member.contact_email}`} className="link">
                  {member.contact_email}
                </a>
              </p>
            ) : null}
            {member.contact_phone ? (
              <p className="text-stone-600">{member.contact_phone}</p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export function CommitteePage() {
  const { data, error, loading } = useSupabaseQuery<CommitteeMember[]>(
    () => supabase.from('committee_members').select('*'),
    'committee',
  )

  const today = todayInFiji()

  return (
    <>
      <PageHeader
        title="Committee"
        description={`Office bearers of the ${ASSOCIATION_NAME}.`}
      />

      <QueryBoundary loading={loading} error={error} data={data}>
        {(members) => {
          const current = sortCommittee(members.filter((m) => isCurrent(m, today)))
          const past = sortCommittee(members.filter((m) => !isCurrent(m, today)))

          if (members.length === 0) {
            return <EmptyState message="Committee members have not been added yet." />
          }

          return (
            <div className="space-y-10">
              <section>
                <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                  <span className="rule" aria-hidden="true" />
                  Current committee
                </h2>
                {current.length === 0 ? (
                  <EmptyState message="No current office bearers are recorded — every term on file has ended." />
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {current.map((member) => (
                      <MemberCard key={member.id} member={member} />
                    ))}
                  </ul>
                )}
              </section>

              {past.length > 0 ? (
                <section>
                  <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                    <span className="rule" aria-hidden="true" />
                    Past office bearers
                  </h2>
                  <ul className="grid gap-4 opacity-80 sm:grid-cols-2">
                    {past.map((member) => (
                      <MemberCard key={member.id} member={member} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )
        }}
      </QueryBoundary>
    </>
  )
}
