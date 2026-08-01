// Minimal store-only ZIP writer for the originals export. JPEG/HEIC bytes do
// not compress, so entries are stored uncompressed (method 0), which keeps
// this dependency-free and exact. Names are encoded as UTF-8 (flag 0x0800).
// Archives must stay below 4 GiB total; the per-challenge export is far under.

export interface ZipEntry {
  name: string
  data: Uint8Array
  modified?: Date
}

let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  crcTable = table
  return table
}

export function crc32(data: Uint8Array): number {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i += 1) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()))
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const checksum = crc32(entry.data)
    const { time, date } = dosDateTime(entry.modified ?? new Date())

    const local = new Uint8Array(30 + nameBytes.length)
    writeUint32(local, 0, 0x04034b50)
    writeUint16(local, 4, 20) // version needed
    writeUint16(local, 6, 0x0800) // UTF-8 names
    writeUint16(local, 8, 0) // method: store
    writeUint16(local, 10, time)
    writeUint16(local, 12, date)
    writeUint32(local, 14, checksum)
    writeUint32(local, 18, entry.data.length)
    writeUint32(local, 22, entry.data.length)
    writeUint16(local, 26, nameBytes.length)
    writeUint16(local, 28, 0) // extra length
    local.set(nameBytes, 30)

    const central = new Uint8Array(46 + nameBytes.length)
    writeUint32(central, 0, 0x02014b50)
    writeUint16(central, 4, 20) // version made by
    writeUint16(central, 6, 20) // version needed
    writeUint16(central, 8, 0x0800)
    writeUint16(central, 10, 0)
    writeUint16(central, 12, time)
    writeUint16(central, 14, date)
    writeUint32(central, 16, checksum)
    writeUint32(central, 20, entry.data.length)
    writeUint32(central, 24, entry.data.length)
    writeUint16(central, 28, nameBytes.length)
    writeUint32(central, 42, offset)
    central.set(nameBytes, 46)

    localParts.push(local, entry.data)
    centralParts.push(central)
    offset += local.length + entry.data.length
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0)
  const endRecord = new Uint8Array(22)
  writeUint32(endRecord, 0, 0x06054b50)
  writeUint16(endRecord, 8, entries.length)
  writeUint16(endRecord, 10, entries.length)
  writeUint32(endRecord, 12, centralSize)
  writeUint32(endRecord, 16, offset)

  const total = offset + centralSize + endRecord.length
  const archive = new Uint8Array(total)
  let cursor = 0
  for (const part of [...localParts, ...centralParts, endRecord]) {
    archive.set(part, cursor)
    cursor += part.length
  }
  return archive
}

export function zipBlob(entries: ZipEntry[]): Blob {
  const bytes = buildZip(entries)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([buffer], { type: 'application/zip' })
}
