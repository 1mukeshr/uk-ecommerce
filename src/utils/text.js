/** Title-case product / display names (every word capitalized). */
export function capitalizeWords(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/(^|[^a-z0-9])([a-z])/g, (_, sep, char) => sep + char.toUpperCase())
}
