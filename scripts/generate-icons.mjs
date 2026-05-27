import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = join(root, 'public', 'favicon.svg')
const publicDir = join(root, 'public')

const svg = await readFile(svgPath)

const targets = [
  { name: 'favicon-32.png',      size: 32  },
  { name: 'icon-192.png',        size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, name))
  console.log(`✓ ${name} (${size}x${size})`)
}
