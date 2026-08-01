import {
  ARCHIVE_PRESERVE_LIMIT,
  ARCHIVE_QUALITY_STEPS,
  ARCHIVE_SCALE_QUALITY,
  ARCHIVE_SCALE_STEPS,
  GAME_HARD_LIMIT,
  GAME_MAX_DIMENSION,
  GAME_QUALITY_STEPS,
  GAME_SCALE_QUALITY,
  GAME_SCALE_STEPS,
  GAME_TARGET_BYTES,
  chooseArchiveAction,
  classifyOriginal,
  fitScale,
  scaledDimensions,
} from './photo-policy'

export interface PreparedPhoto {
  /** Bytes stored in the photo-originals bucket. */
  archive: Blob
  archiveMime: string
  archiveExtension: string
  /** True when the archive copy is not byte-identical to the capture. */
  archiveReduced: boolean
  /** True when the capture was larger than the preserve limit (drives the notice). */
  oversizedOriginal: boolean
  originalFilename: string
  width: number
  height: number
  /** 2400 px JPEG used for voting and TV mode. */
  gameCopy: Blob
}

const DECODE_ERROR =
  'This photo could not be read by your browser. HEIC photos work in Safari; on other browsers, convert the photo to JPEG and try again.'

async function decodePhoto(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(DECODE_ERROR)
  }
}

function renderToCanvas(bitmap: ImageBitmap, scale: number): HTMLCanvasElement {
  const { width, height } = scaledDimensions(bitmap.width, bitmap.height, scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare the photo.')
  context.drawImage(bitmap, 0, 0, width, height)
  return canvas
}

async function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) throw new Error('The photo could not be compressed.')
  return blob
}

interface EncodePlanStep {
  scale: number
  quality: number
}

/**
 * Walk an encode ladder and return the first result at or below sizeLimit.
 * Canvases are cached per scale so quality retries do not redraw.
 */
async function encodeWithin(
  bitmap: ImageBitmap,
  steps: EncodePlanStep[],
  sizeLimit: number,
): Promise<{ blob: Blob; scale: number } | null> {
  const canvases = new Map<number, HTMLCanvasElement>()
  try {
    for (const step of steps) {
      let canvas = canvases.get(step.scale)
      if (!canvas) {
        canvas = renderToCanvas(bitmap, step.scale)
        canvases.set(step.scale, canvas)
      }
      const blob = await encodeJpeg(canvas, step.quality)
      if (blob.size <= sizeLimit) return { blob, scale: step.scale }
    }
    return null
  } finally {
    for (const canvas of canvases.values()) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}

async function buildArchive(bitmap: ImageBitmap): Promise<Blob> {
  const steps: EncodePlanStep[] = [
    ...ARCHIVE_QUALITY_STEPS.map((quality) => ({ scale: 1, quality })),
    ...ARCHIVE_SCALE_STEPS.map((scale) => ({ scale, quality: ARCHIVE_SCALE_QUALITY })),
  ]
  const result = await encodeWithin(bitmap, steps, ARCHIVE_PRESERVE_LIMIT)
  if (!result) throw new Error('This photo is too complex to store. Try a smaller photo.')
  return result.blob
}

async function buildGameCopy(bitmap: ImageBitmap): Promise<Blob> {
  const baseScale = fitScale(bitmap.width, bitmap.height, GAME_MAX_DIMENSION)

  const targetSteps: EncodePlanStep[] = GAME_QUALITY_STEPS.map((quality) => ({ scale: baseScale, quality }))
  const withinTarget = await encodeWithin(bitmap, targetSteps, GAME_TARGET_BYTES)
  if (withinTarget) return withinTarget.blob

  const fallbackSteps: EncodePlanStep[] = [
    { scale: baseScale, quality: GAME_QUALITY_STEPS[GAME_QUALITY_STEPS.length - 1] },
    ...GAME_SCALE_STEPS.map((scale) => ({ scale: baseScale * scale, quality: GAME_SCALE_QUALITY })),
  ]
  const withinLimit = await encodeWithin(bitmap, fallbackSteps, GAME_HARD_LIMIT)
  if (!withinLimit) throw new Error('This photo is too complex to prepare for the game. Try a smaller photo.')
  return withinLimit.blob
}

/**
 * Produce both stored copies of a capture:
 * - archive: exact bytes for HEIC/JPEG at or below the preserve limit,
 *   otherwise a full-size JPEG optimized below that limit
 * - gameCopy: 2400 px JPEG, ~1.5 MB target, always below the bucket limit
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const kind = classifyOriginal(file.name, file.type)
  const action = chooseArchiveAction(file.size, kind.preservable)
  const bitmap = await decodePhoto(file)

  try {
    const gameCopy = await buildGameCopy(bitmap)

    if (action === 'preserve') {
      return {
        archive: file,
        archiveMime: kind.mime ?? 'image/jpeg',
        archiveExtension: kind.extension ?? 'jpg',
        archiveReduced: false,
        oversizedOriginal: false,
        originalFilename: file.name,
        width: bitmap.width,
        height: bitmap.height,
        gameCopy,
      }
    }

    const archive = await buildArchive(bitmap)
    return {
      archive,
      archiveMime: 'image/jpeg',
      archiveExtension: 'jpg',
      archiveReduced: true,
      oversizedOriginal: kind.preservable && file.size > ARCHIVE_PRESERVE_LIMIT,
      originalFilename: file.name,
      width: bitmap.width,
      height: bitmap.height,
      gameCopy,
    }
  } finally {
    bitmap.close()
  }
}
