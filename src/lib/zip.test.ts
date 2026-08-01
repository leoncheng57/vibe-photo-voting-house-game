import { describe, expect, it } from 'vitest'
import { buildZip, crc32 } from './zip'

const encoder = new TextEncoder()

function readUint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

describe('crc32', () => {
  it('matches known vectors', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(encoder.encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('buildZip', () => {
  it('produces a valid empty archive', () => {
    const archive = buildZip([])
    expect(archive.length).toBe(22)
    expect(readUint32(archive, 0)).toBe(0x06054b50)
    expect(readUint16(archive, 10)).toBe(0)
  })

  it('stores entries uncompressed with correct sizes and CRCs', () => {
    const data = encoder.encode('house photo hunt')
    const archive = buildZip([{ name: 'manifest.json', data, modified: new Date(2026, 6, 31, 12, 30, 10) }])

    // Local header
    expect(readUint32(archive, 0)).toBe(0x04034b50)
    expect(readUint16(archive, 8)).toBe(0) // store method
    expect(readUint32(archive, 14)).toBe(crc32(data))
    expect(readUint32(archive, 18)).toBe(data.length)
    expect(readUint16(archive, 26)).toBe('manifest.json'.length)

    // Stored bytes follow the header + name directly.
    const dataStart = 30 + 'manifest.json'.length
    expect(archive.slice(dataStart, dataStart + data.length)).toEqual(data)

    // Central directory + end record
    const centralOffset = dataStart + data.length
    expect(readUint32(archive, centralOffset)).toBe(0x02014b50)
    const endOffset = archive.length - 22
    expect(readUint32(archive, endOffset)).toBe(0x06054b50)
    expect(readUint16(archive, endOffset + 10)).toBe(1)
    expect(readUint32(archive, endOffset + 16)).toBe(centralOffset)
  })

  it('tracks offsets across multiple entries', () => {
    const first = encoder.encode('a'.repeat(100))
    const second = encoder.encode('b'.repeat(50))
    const archive = buildZip([
      { name: '01-alex.jpg', data: first },
      { name: '02-sam.heic', data: second },
    ])

    const secondLocalOffset = 30 + '01-alex.jpg'.length + first.length
    expect(readUint32(archive, secondLocalOffset)).toBe(0x04034b50)

    const endOffset = archive.length - 22
    expect(readUint16(archive, endOffset + 10)).toBe(2)

    const centralOffset = readUint32(archive, endOffset + 16)
    // Second central record points back at the second local header.
    const firstCentralLength = 46 + '01-alex.jpg'.length
    expect(readUint32(archive, centralOffset + firstCentralLength + 42)).toBe(secondLocalOffset)
  })
})
