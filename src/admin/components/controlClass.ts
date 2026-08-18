/**
 * Shared styling for form controls.
 *
 * In its own module rather than alongside `Field`, so that file exports only
 * components and keeps working with fast refresh.
 */
const BASE =
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500'

export function controlClass(hasError: boolean): string {
  return `${BASE} ${
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-stone-300 focus:border-crimson-500'
  }`
}
