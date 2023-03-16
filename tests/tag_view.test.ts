import * as fs from 'node:fs/promises'
import { expect, test } from 'vitest'
import { parseBuffer as mmParse } from 'music-metadata'
import { createTagView, dump, parse, PictureType } from '../src'

test('read and write title', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)

  // read
  expect(tagView.title).toBe('v2.4 title')

  // write
  tagView.title = 'updated title'
  const { common } = await mmParse(dump(id3!, file))
  expect(common.title).toBe('updated title')
})

test('read and write artist', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)

  // read
  expect(tagView.artist).toBe('v2.4 artist')

  // write
  tagView.artist = 'updated artist'
  const { common } = await mmParse(dump(id3!, file))
  expect(common.artist).toBe('updated artist')
})

test('read and write album', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)

  // read
  expect(tagView.album).toBe('某专辑')

  // write
  tagView.album = '专辑名'
  const { common } = await mmParse(dump(id3!, file))
  expect(common.album).toBe('专辑名')
})

test('read and write track', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)

  // read
  expect(tagView.track).toEqual({ current: 1, total: 6 })

  // write
  tagView.track = { current: 2, total: 7 }
  const { common } = await mmParse(dump(id3!, file))
  expect(common.track).toEqual({ no: 2, of: 7 })
})

test('read and write picture', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)

  // read
  expect(tagView.findPicture(PictureType.Media)).toBeUndefined()
  const frontCover = tagView.findPicture(PictureType.FrontCover)!
  expect(frontCover.mime).toBe('image/jpeg')
  expect(frontCover.description).toBe('front cover')
  expect(frontCover.picture).toEqual(
    await fs.readFile('./fixtures/picture.jpg')
  )

  // write
  const png = await fs.readFile('./fixtures/picture.png')
  tagView.attachPicture({
    type: PictureType.FrontCover,
    description: 'FRONT COVER',
    picture: png,
  })
  const { common } = await mmParse(dump(id3!, file))
  const mmFrontCover = common.picture!.find(
    ({ type }) => type === 'Cover (front)'
  )!
  expect(mmFrontCover.format).toBe('image/png')
  expect(mmFrontCover.description).toBe('FRONT COVER')
  expect(mmFrontCover.data).toEqual(png)
})

test('remove single picture', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)
  tagView.removePicture(PictureType.BackCover)

  const { common } = await mmParse(dump(id3!, file))
  expect(common.picture!.some(({ type }) => type === 'Cover (back)')).toBe(
    false
  )
})

test('remove all pictures', async () => {
  const file = await fs.readFile('./fixtures/id3v2.4.mp3')
  const id3 = parse(file)
  const tagView = createTagView(id3)
  tagView.removeAllPictures()

  const { common } = await mmParse(dump(id3!, file))
  expect(common.picture).toBeUndefined()
})

test('detect JPG file', async () => {
  const tagView = createTagView(undefined)
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await fs.readFile('./fixtures/picture.jpg'),
  })

  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/jpeg')
})

test('detect PNG file', async () => {
  const tagView = createTagView(undefined)
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await fs.readFile('./fixtures/picture.png'),
  })

  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/png')
})

test('detect BMP file', async () => {
  const tagView = createTagView(undefined)
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await fs.readFile('./fixtures/picture.bmp'),
  })

  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/bmp')
})

test('detect GIF file', async () => {
  const tagView = createTagView(undefined)
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await fs.readFile('./fixtures/picture.gif'),
  })

  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/gif')
})

test('detect WebP file', async () => {
  const tagView = createTagView(undefined)
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await fs.readFile('./fixtures/picture.webp'),
  })

  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/webp')
})

test('unknown picture type', () => {
  const tagView = createTagView(undefined)
  const avif = Uint8Array.of(
    0x00,
    0x00,
    0x00,
    0x1c,
    0x66,
    0x74,
    0x79,
    0x70,
    0x61,
    0x76,
    0x69,
    0x66
  )
  expect(() => {
    tagView.attachPicture({ type: PictureType.FrontCover, picture: avif })
  }).toThrow()

  // specify MIME manually which will disable auto detection
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: avif,
    mime: 'image/avif',
  })
  expect(tagView.findPicture(PictureType.FrontCover)?.mime).toBe('image/avif')
})
