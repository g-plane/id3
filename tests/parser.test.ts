import * as fs from 'node:fs/promises'
import { expect, test } from 'vitest'
import {
  isAttachedPictureFrame,
  isCommentFrame,
  isTextFrame,
  parse,
  PictureType,
  TextEncoding,
} from '../src'
import type { AttachedPictureFrame, TextFrame } from '../src'

test('accept file without ID3 tag', () => {
  expect(parse(Uint8Array.of(1, 2, 3, 4, 5))).toBeUndefined()
})

test('recognize ID3 version', async () => {
  const v2_4 = parse(await fs.readFile('./fixtures/id3v2.4.mp3'))!
  expect(v2_4.version.major).toBe(4)
  expect(v2_4.version.revision).toBe(0)

  const v2_3 = parse(await fs.readFile('./fixtures/id3v2.3.mp3'))!
  expect(v2_3.version.major).toBe(3)
  expect(v2_3.version.revision).toBe(0)
})

test('parse frame ID', async () => {
  const v2_4 = parse(await fs.readFile('./fixtures/id3v2.4.mp3'))!
  expect(v2_4.frames.map(({ id }) => id)).toEqual([
    'TSSE',
    'TIT2',
    'TPE1',
    'TALB',
    'TDRC',
    'TRCK',
    'TCON',
    'COMM',
    'APIC',
    'APIC',
  ])

  const v2_3 = parse(await fs.readFile('./fixtures/id3v2.3.mp3'))!
  expect(v2_3.frames.map(({ id }) => id)).toEqual([
    'TIT2',
    'TPE1',
    'TALB',
    'TYER',
    'TRCK',
    'TCON',
    'COMM',
    'APIC',
    'APIC',
  ])
})

test('parse text frame', async () => {
  const v2_4 = parse(await fs.readFile('./fixtures/id3v2.4.mp3'))!
  const v2_4title = v2_4.frames.find(
    (frame): frame is TextFrame => isTextFrame(frame) && frame.id === 'TIT2'
  )!
  expect(v2_4title.encoding).toBe(TextEncoding['UTF-8'])
  expect(v2_4title.text).toBe('v2.4 title')
  const v2_4album = v2_4.frames.find(
    (frame): frame is TextFrame => isTextFrame(frame) && frame.id === 'TALB'
  )!
  expect(v2_4album.encoding).toBe(TextEncoding['UTF-8'])
  expect(v2_4album.text).toBe('某专辑')

  const v2_3 = parse(await fs.readFile('./fixtures/id3v2.3.mp3'))!
  const v2_3title = v2_3.frames.find(
    (frame): frame is TextFrame => isTextFrame(frame) && frame.id === 'TIT2'
  )!
  expect(v2_3title.encoding).toBe(TextEncoding['ISO-8859-1'])
  expect(v2_3title.text).toBe('v2.3 title')
  const v2_3album = v2_3.frames.find(
    (frame): frame is TextFrame => isTextFrame(frame) && frame.id === 'TALB'
  )!
  expect(v2_3album.encoding).toBe(TextEncoding['UTF-16'])
  expect(v2_3album.text).toBe('某专辑')
})

test('parse comment frame', async () => {
  const v2_4 = parse(await fs.readFile('./fixtures/id3v2.4.mp3'))!
  const v2_4comment = v2_4.frames.find(isCommentFrame)!
  expect(v2_4comment.encoding).toBe(TextEncoding['UTF-8'])
  expect(v2_4comment.language).toBe('XXX')
  expect(v2_4comment.description).toBe('')
  expect(v2_4comment.text).toBe('comment here 这是注释')

  const v2_3 = parse(await fs.readFile('./fixtures/id3v2.3.mp3'))!
  const v2_3comment = v2_3.frames.find(isCommentFrame)!
  expect(v2_3comment.encoding).toBe(TextEncoding['UTF-16'])
  expect(v2_3comment.language).toBe('\x00\x00\x00')
  expect(v2_3comment.description).toBe('')
  expect(v2_3comment.text).toBe('comment here 这是注释')
})

test('parse attached picture frame', async () => {
  const frontCover = await fs.readFile('./fixtures/picture.jpg')
  const backCover = await fs.readFile('./fixtures/picture.png')

  const v2_4 = parse(await fs.readFile('./fixtures/id3v2.4.mp3'))!
  const v2_4front = v2_4.frames.find(
    (frame): frame is AttachedPictureFrame =>
      isAttachedPictureFrame(frame) &&
      frame.pictureType === PictureType.FrontCover
  )!
  expect(v2_4front.encoding).toBe(TextEncoding['UTF-8'])
  expect(v2_4front.mimeType).toBe('image/jpeg')
  expect(v2_4front.description).toBe('front cover')
  expect(v2_4front.picture, 'picture does not match as expected').toEqual(
    frontCover
  )
  const v2_4back = v2_4.frames.find(
    (frame): frame is AttachedPictureFrame =>
      isAttachedPictureFrame(frame) &&
      frame.pictureType === PictureType.BackCover
  )!
  expect(v2_4back.encoding).toBe(TextEncoding['UTF-8'])
  expect(v2_4back.mimeType).toBe('image/png')
  expect(v2_4back.description).toBe('这是一张图片')
  expect(v2_4back.picture, 'picture does not match as expected').toEqual(
    backCover
  )

  const v2_3 = parse(await fs.readFile('./fixtures/id3v2.3.mp3'))!
  const v2_3front = v2_3.frames.find(
    (frame): frame is AttachedPictureFrame =>
      isAttachedPictureFrame(frame) &&
      frame.pictureType === PictureType.FrontCover
  )!
  expect(v2_3front.encoding).toBe(TextEncoding['ISO-8859-1'])
  expect(v2_3front.mimeType).toBe('image/jpeg')
  expect(v2_3front.description).toBe('front cover')
  expect(v2_3front.picture, 'picture does not match as expected').toEqual(
    frontCover
  )
  const v2_3back = v2_3.frames.find(
    (frame): frame is AttachedPictureFrame =>
      isAttachedPictureFrame(frame) &&
      frame.pictureType === PictureType.BackCover
  )!
  expect(v2_3back.encoding).toBe(TextEncoding['UTF-16'])
  expect(v2_3back.mimeType).toBe('image/png')
  expect(v2_3back.description).toBe('这是一张图片')
  expect(v2_3back.picture, 'picture does not match as expected').toEqual(
    backCover
  )
})
