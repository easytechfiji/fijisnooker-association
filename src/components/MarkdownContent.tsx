import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * The actual react-markdown render. Kept in its own module so `Markdown.tsx`
 * can load it lazily — see the note there.
 *
 * This is where the plan's XSS requirement is met, and it is met structurally:
 * `rehype-raw` is deliberately NOT installed, so react-markdown never parses
 * embedded HTML — a `<script>` in a post body is escaped and shown as text
 * rather than executed. react-markdown's default `urlTransform` additionally
 * strips `javascript:` and other dangerous schemes from link and image URLs,
 * so it is left at its default rather than overridden.
 *
 * The consequence: do not add `rehype-raw`, and do not pass `urlTransform`,
 * without replacing them with DOMPurify at the same time.
 */
export default function MarkdownContent({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
}
