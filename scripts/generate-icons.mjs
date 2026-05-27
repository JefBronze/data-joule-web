import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

const locales = ['en', 'pt', 'fr']

// { prefix, sizeSuffix, pixels }
//   prefix     = filename head ('favicon', 'icon', 'apple-touch-icon')
//   sizeSuffix = filename tail before .png (e.g. '-32', '-192', '' for apple)
//   pixels     = rendered px size
const targets = [
  { prefix: 'favicon',          sizeSuffix: '-32',  pixels: 32  },
  { prefix: 'icon',             sizeSuffix: '-192', pixels: 192 },
  { prefix: 'apple-touch-icon', sizeSuffix: '',     pixels: 180 },
]

async function render(svgBuffer, outName, pixels) {
  await sharp(svgBuffer, { density: 384 })
    .resize(pixels, pixels)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, outName))
  console.log(`✓ ${outName} (${pixels}x${pixels})`)
}

// Locale-specific PNGs: favicon-{xx}-32.png, icon-{xx}-192.png, apple-touch-icon-{xx}.png
for (const locale of locales) {
  const svg = await readFile(join(publicDir, `favicon-${locale}.svg`))
  for (const { prefix, sizeSuffix, pixels } of targets) {
    await render(svg, `${prefix}-${locale}${sizeSuffix}.png`, pixels)
  }
}

// Default (no-locale) PNGs as copies of EN — for any external/legacy reference
console.log('--- Default (EN) copies ---')
const enSvg = await readFile(join(publicDir, 'favicon-en.svg'))
for (const { prefix, sizeSuffix, pixels } of targets) {
  await render(enSvg, `${prefix}${sizeSuffix}.png`, pixels)
}
