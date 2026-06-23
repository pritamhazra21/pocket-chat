// Generates simple placeholder PWA icons (teal background + white speech bubble)
// with zero dependencies. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../public/icons/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const BG = [0, 168, 132] // teal
const FG = [255, 255, 255]

function makePng(size) {
  const r = size / 2
  const bubbleR = size * 0.3
  const cx = size / 2
  const cy = size * 0.46
  const tailH = size * 0.12

  const raw = Buffer.alloc((size * 3 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter byte per scanline
    for (let x = 0; x < size; x++) {
      const inBubble = Math.hypot(x - cx, y - cy) <= bubbleR
      // little tail triangle below the bubble
      const inTail =
        y > cy && y < cy + tailH + bubbleR * 0.7 &&
        x > cx - tailH && x < cx &&
        x - (cx - tailH) > (y - (cy + bubbleR * 0.4))
      const [rr, gg, bb] = inBubble || inTail ? FG : BG
      raw[p++] = rr
      raw[p++] = gg
      raw[p++] = bb
    }
  }

  const chunks = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])]
  chunks.push(chunk('IHDR', ihdr(size)))
  chunks.push(chunk('IDAT', deflateSync(raw)))
  chunks.push(chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(chunks)
}

function ihdr(size) {
  const b = Buffer.alloc(13)
  b.writeUInt32BE(size, 0)
  b.writeUInt32BE(size, 4)
  b[8] = 8 // bit depth
  b[9] = 2 // color type: truecolor RGB
  return b
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, OUT), makePng(size))
  console.log(`wrote public/icons/icon-${size}.png`)
}
