import fs from "node:fs"
import zlib from "node:zlib"
import path from "node:path"

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const bg = [23, 50, 79, 255]
  const ink = [244, 247, 251, 255]
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const color = pixel(x, y, size) ? ink : bg
      const i = row + 1 + x * 4
      raw[i] = color[0]
      raw[i + 1] = color[1]
      raw[i + 2] = color[2]
      raw[i + 3] = color[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}

function pixel(x, y, size) {
  const nx = x / size
  const ny = y / size
  const left = 0.36
  const right = 0.64
  const top = 0.22
  const bottom = 0.78
  const radius = 0.07
  const inBody = rounded(nx, ny, left, top, right, bottom, radius)
  const inner = rounded(nx, ny, left + 0.035, top + 0.035, right - 0.035, bottom - 0.035, radius * 0.7)
  const band = nx > left + 0.06 && nx < right - 0.06 && ny > 0.36 && ny < 0.4
  return (inBody && !inner) || band
}

function rounded(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

const dir = path.resolve("public")
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192))
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512))
