import type { ReactNode } from 'react'

import { Spinner } from './Spinner.tsx'
import { ErrorMessage } from './ErrorMessage.tsx'

/**
 * The loading / error / loaded switch every data page repeats.
 *
 * `children` is a function rather than a node so it is only called once data
 * has actually arrived — that way pages can read the result without a null
 * check on every field.
 */
export function QueryBoundary<T>({
  loading,
  error,
  data,
  children,
}: {
  loading: boolean
  error: string | null
  data: T | null
  children: (data: T) => ReactNode
}) {
  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />
  if (data === null) return <ErrorMessage message="No data was returned." />
  return <>{children(data)}</>
}
