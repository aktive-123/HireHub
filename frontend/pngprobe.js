const fs = require('fs')
const zlib = require('zlib')

const buf = fs.readFileSync('src/assets/HIREHUBlogo.png')
let off = 8
function chunk() {
  const len = buf.readUInt32BE(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  const data = buf.subarray(off + 8, off + 8 + len)
  off += 12 + len
  return { type, data, len }
}

let width, height, bitDepth, colorType
const idat = []
for (;;) {
  const c = chunk()
  if (c.type === 'IHDR') {
    width = c.data.readUInt32BE(0)
    height = c.data.readUInt32BE(4)
    bitDepth = c.data.readUInt8(8)
    colorType = c.data.readUInt8(9)
  } else if (c.type === 'IDAT') idat.push(c.data)
  else if (c.type === 'IEND') break
}

const raw = zlib.inflateSync(Buffer.concat(idat))
const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
const bpp = (channels * bitDepth) / 8
const stride = width * bpp

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

const rows = new Array(height)
const prev = new Uint8Array(stride)
for (let y = 0; y < height; y++) {
  const f = raw[y * (stride + 1)]
  const row = new Uint8Array(stride)
  const s = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? row[x - bpp] : 0
    const b = prev[x]
    const c = x >= bpp ? prev[x - bpp] : 0
    let v = s[x]
    if (f === 1) v = (v + a) & 255
    else if (f === 2) v = (v + b) & 255
    else if (f === 3) v = (v + ((a + b) >> 1)) & 255
    else if (f === 4) v = (v + paeth(a, b, c)) & 255
    row[x] = v
  }
  rows[y] = row
  prev.set(row)
}

const clusters = new Map()
function add(r, g, b, a, count) {
  if (a < 128) return
  if (r > 245 && g > 245 && b > 245) return
  if (r < 6 && g < 6 && b < 6) return
  const key = (((r >> 4) << 8) | (g >> 4) << 4) | (b >> 4)
  const e = clusters.get(key)
  if (e) {
    e.n += count
    e.r += r * count
    e.g += g * count
    e.b += b * count
  } else clusters.set(key, { n: count, r: r * count, g: g * count, b: b * count, key })
}

const step = Math.max(1, Math.floor(width / 800))
for (let y = 0; y < height; y += step) {
  const row = rows[y]
  for (let x = 0; x < width; x += step) {
    const i = x * bpp
    add(row[i], row[i + 1], row[i + 2], channels === 4 ? row[i + 3] : 255, 1)
  }
}

const sorted = [...clusters.values()].sort((a, b) => b.n - a.n)
console.log('samples:', sorted.reduce((s, e) => s + e.n, 0))
for (const e of sorted.slice(0, 16)) {
  const r = Math.round(e.r / e.n)
  const g = Math.round(e.g / e.n)
  const b = Math.round(e.b / e.n)
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  const hsl = rgbToHsl(r, g, b)
  console.log(`${hex}   rgb(${r},${g},${b})  hsl(${hsl})  n=${e.n}`)
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
  }
  return `${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
}