import {
  FrameContentType,
  Preservation,
  TextEncoding,
  isAttachedPictureFrame,
  isTextFrame,
} from './types.js'
import type {
  AttachedPictureFrame,
  Frame,
  FrameContent,
  FrameHeader,
  ID3,
  PictureType,
  TextFrame,
} from './types.js'

export interface TagView {
  get title(): string | undefined
  set title(value: string | undefined | null)
  get artist(): string | undefined
  set artist(value: string | undefined | null)
  get album(): string | undefined
  set album(value: string | undefined | null)
  get track(): TrackNumber | undefined
  set track(value: TrackNumber | undefined | null)
  findPicture(type: PictureType): AttachedPicture | undefined
  attachPicture(options: PictureAttachingOptions): void
  removePicture(type: PictureType): void
  removeAllPictures(): void
}

export interface TrackNumber {
  current: number
  total?: number
}

export interface AttachedPicture {
  mime: string
  type: PictureType
  description: string
  picture: Uint8Array
}

export interface PictureAttachingOptions {
  type: PictureType
  picture: Uint8Array
  mime?: string
  description?: string
}

export function createTagView(id3: ID3 | undefined): TagView {
  const tag = id3 ?? {
    version: { major: 4, revision: 0 },
    flags: {
      unsynchronisation: false,
      isExperimental: false,
    },
    frames: [],
  }

  return {
    get title() {
      return tag.frames.find((frame): frame is TextFrame => frame.id === 'TIT2')
        ?.text
    },
    set title(value) {
      setTextFrameValue({ tag, id: 'TIT2', value })
    },
    get artist() {
      return tag.frames.find((frame): frame is TextFrame => frame.id === 'TPE1')
        ?.text
    },
    set artist(value) {
      setTextFrameValue({ tag, id: 'TPE1', value })
    },
    get album() {
      return tag.frames.find((frame): frame is TextFrame => frame.id === 'TALB')
        ?.text
    },
    set album(value) {
      setTextFrameValue({ tag, id: 'TALB', value })
    },
    get track() {
      const value = tag.frames.find(
        (frame): frame is TextFrame => frame.id === 'TRCK'
      )?.text
      if (value === undefined) {
        return value
      }
      const matches = /^(\d+)(?:\/(\d+))$/.exec(value)
      if (!matches) {
        return undefined
      }
      const [, current, total] = matches
      return {
        current: Number.parseInt(current!),
        total: total ? Number.parseInt(total) : undefined,
      }
    },
    set track(value) {
      const current = value?.current
      const total = value?.total
      setTextFrameValue({
        tag,
        id: 'TRCK',
        value: current && total
          ? `${current}/${total}`
          : current
          ? current.toString()
          : undefined,
      })
    },
    findPicture(type) {
      const frame = tag.frames.find(
        (frame): frame is AttachedPictureFrame =>
          isAttachedPictureFrame(frame) && frame.pictureType === type
      )
      if (frame) {
        return {
          mime: frame.mimeType,
          type: frame.pictureType,
          description: frame.description,
          picture: frame.picture,
        }
      }
    },
    attachPicture({ type, picture, mime, description = '' }) {
      const mimeType = mime || detectPictureMime(picture)

      const frame = tag.frames.find(
        (frame): frame is AttachedPictureFrame =>
          isAttachedPictureFrame(frame) && frame.pictureType === type
      )
      if (frame) {
        frame.mimeType = mimeType
        frame.pictureType = type
        frame.description = description
        frame.picture = picture
      } else {
        const frame = createFrame(FrameContentType.AttachedPicture, 'APIC', {
          encoding: tag.version.major >= 4
            ? TextEncoding['UTF-8']
            : TextEncoding['UTF-16'],
          mimeType,
          pictureType: type,
          description,
          picture,
        })
        tag.frames.push(frame)
      }
    },
    removePicture(type) {
      tag.frames = tag.frames.filter(
        (frame) => !(isAttachedPictureFrame(frame) && frame.pictureType === type)
      )
    },
    removeAllPictures() {
      tag.frames = tag.frames.filter((frame) => !isAttachedPictureFrame(frame))
    },
  }
}

function createFrame<
  T extends FrameContentType,
  F extends Extract<Frame, { type: T }>,
>(type: T, id: string, content: Omit<FrameContent<F>, 'type'>): F {
  const header: FrameHeader = {
    id,
    flags: {
      tagAlterPreservation: Preservation.Preserved,
      fileAlterPreservation: Preservation.Preserved,
      readOnly: false,
      grouping: false,
      compressed: false,
      encrypted: false,
      unsyrchronised: false,
      hasDataLengthIndicator: false,
    },
  }
  return { ...header, type, ...content } as F
}

const TEXT_FRAME_INSERTION_ORDER = [
  'TIT2',
  'TPE1',
  'TALB',
  'TRCK',
  'TYER',
  'TCON',
]

function setTextFrameValue({
  tag,
  id,
  value,
}: {
  tag: ID3,
  id: string,
  value: string | undefined | null,
}) {
  if (value == null) {
    tag.frames = tag.frames.filter((frame) => frame.id !== id)
    return
  }

  const frame = tag.frames.find((frame): frame is TextFrame => frame.id === id)
  if (frame) {
    frame.text = value
  } else {
    const frame = createFrame(FrameContentType.Text, id, {
      encoding: tag.version.major >= 4
        ? TextEncoding['UTF-8']
        : TextEncoding['UTF-16'],
      text: value,
    })

    const index = TEXT_FRAME_INSERTION_ORDER.indexOf(frame.id)
    if (index < 0 || index === TEXT_FRAME_INSERTION_ORDER.length - 1) {
      // @ts-expect-error TypeScript lib.d.ts doesn't support this
      const index = tag.frames.findLastIndex(isTextFrame)
      if (index < 0) {
        tag.frames.unshift(frame)
      } else {
        tag.frames.splice(index, 0, frame)
      }
    } else {
      let index = -1
      for (const id of TEXT_FRAME_INSERTION_ORDER) {
        index = tag.frames.findIndex((frame) => frame.id === id)
      }
      if (index === -1) {
        tag.frames.unshift(frame)
      } else {
        tag.frames.splice(index, 0, frame)
      }
    }
  }
}

function detectPictureMime(picture: Uint8Array): string {
  if (picture[0] === 0xff && picture[1] === 0xd8 && picture[2] === 0xff) {
    return 'image/jpeg'
  } else if (
    picture[0] === 0x89 &&
    picture[1] === 0x50 &&
    picture[2] === 0x4e &&
    picture[3] === 0x47 &&
    picture[4] === 0x0d &&
    picture[5] === 0x0a &&
    picture[6] === 0x1a &&
    picture[7] === 0x0a
  ) {
    return 'image/png'
  } else if (picture[0] === 0x42 && picture[1] === 0x4d) {
    return 'image/bmp'
  } else if (
    picture[0] === 0x47 &&
    picture[1] === 0x49 &&
    picture[2] === 0x46
  ) {
    return 'image/gif'
  } else if (
    picture[0] === 0x52 &&
    picture[1] === 0x49 &&
    picture[2] === 0x46 &&
    picture[3] === 0x46 &&
    picture[8] === 0x57 &&
    picture[9] === 0x45 &&
    picture[10] === 0x42 &&
    picture[11] === 0x50
  ) {
    return 'image/webp'
  } else {
    throw new Error('Unknown picture MIME.')
  }
}
