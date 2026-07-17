import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const indexHtml = resolve('dist/index.html')
const notFoundHtml = resolve('dist/404.html')
const noJekyll = resolve('dist/.nojekyll')
const runtimeConfig = resolve('dist/runtime-config.json')

if (!existsSync(indexHtml)) {
  console.error('dist/index.html missing - run vite build first')
  process.exit(1)
}

copyFileSync(indexHtml, notFoundHtml)
writeFileSync(noJekyll, '')

// Prefer apiUrl from repo public/runtime-config.json (copied into dist by Vite).
// Only fall back to VITE_API_URL when the file has no apiUrl.
let fromFile = ''
try {
  if (existsSync(runtimeConfig)) {
    const data = JSON.parse(readFileSync(runtimeConfig, 'utf8'))
    if (typeof data?.apiUrl === 'string') fromFile = data.apiUrl.trim().replace(/\/$/, '')
  }
} catch {
  // ignore
}

const fromEnv = (process.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const apiUrl = fromFile || fromEnv

if (apiUrl) {
  writeFileSync(runtimeConfig, `${JSON.stringify({ apiUrl }, null, 2)}\n`)
  console.log(
    `Wrote dist/runtime-config.json apiUrl=${apiUrl} (source=${fromFile ? 'runtime-config' : 'VITE_API_URL'})`
  )
} else {
  console.warn('No apiUrl in runtime-config.json or VITE_API_URL - Pages auth will fail')
}

console.log('Created dist/404.html and dist/.nojekyll for GitHub Pages')
