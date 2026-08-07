import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { isCurrent, sortCommittee } from '../lib/committee.ts'
import { formatDate, initials, todayInFiji } from '../lib/format.ts'
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
    <li className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-baize-100 text-sm font-semibold text-baize-700"
        >
          {initials(member.name)}
        </span>
        <div className="min-w-0">
          <h3 className="text-base">{member.name}</h3>
          <p className="text-sm font-medium text-baize-700">{member.role}</p>
          {period ? <p className="mt-1 text-xs text-stone-500">{period}</p> : null}

          <div className="mt-2 space-y-0.5 text-sm">
            {member.contact_email ? (
              <p>
                <a
                  href={`mailto:${member.contact_email}`}
                  className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
                >
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
        description="Office bearers of the Southern Division Billiards & Snooker Association."
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
                <h2 className="mb-4 text-xl">Current committee</h2>
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
                  <h2 className="mb-4 text-xl">Past office bearers</h2>
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
