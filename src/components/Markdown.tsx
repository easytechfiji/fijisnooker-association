import { Suspense, lazy } from 'react'

/**
 * Renders Markdown from the database (news post bodies, player bios).
 *
 * react-markdown pulls in the whole micromark/mdast pipeline — around 70
 * transitive packages — but only two pages ever render Markdown. Loading it
 * lazily keeps it out of the initial bundle, which matters for an audience
 * browsing on Fijian mobile data.
 *
 * The security properties live in MarkdownContent.tsx; read the comment there
 * before changing how the Markdown is rendered.
 */
const MarkdownContent = lazy(() => import('./MarkdownContent.tsx'))

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Suspense
        fallback={
          <p className="text-stone-400" aria-hidden="true">
            Loading…
          </p>
        }
      >
        <MarkdownContent>{children}</MarkdownContent>
      </Suspense>
    </div>
  )
}
