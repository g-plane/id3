import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { parseBuffer as mmParse } from "https://esm.sh/music-metadata@7.11.4/lib/core";
import { createTagView, dump, parse, PictureType } from "./mod.ts";

Deno.test("read and write title", async () => {
  const file = await Deno.readFile("./fixtures/id3v2.4.mp3");
  const id3 = parse(file);
  const tagView = createTagView(id3);

  // read
  assertEquals(tagView.title, "v2.4 title");

  // write
  tagView.title = "updated title";
  const { common } = await mmParse(dump(id3!, file));
  assertEquals(common.title, "updated title");
});

Deno.test("read and write artist", async () => {
  const file = await Deno.readFile("./fixtures/id3v2.4.mp3");
  const id3 = parse(file);
  const tagView = createTagView(id3);

  // read
  assertEquals(tagView.artist, "v2.4 artist");

  // write
  tagView.artist = "updated artist";
  const { common } = await mmParse(dump(id3!, file));
  assertEquals(common.artist, "updated artist");
});

Deno.test("read and write album", async () => {
  const file = await Deno.readFile("./fixtures/id3v2.4.mp3");
  const id3 = parse(file);
  const tagView = createTagView(id3);

  // read
  assertEquals(tagView.album, "某专辑");

  // write
  tagView.album = "专辑名";
  const { common } = await mmParse(dump(id3!, file));
  assertEquals(common.album, "专辑名");
});

Deno.test("read and write track", async () => {
  const file = await Deno.readFile("./fixtures/id3v2.4.mp3");
  const id3 = parse(file);
  const tagView = createTagView(id3);

  // read
  assertEquals(tagView.track, { current: 1, total: 6 });

  // write
  tagView.track = { current: 2, total: 7 };
  const { common } = await mmParse(dump(id3!, file));
  assertEquals(common.track, { no: 2, of: 7 });
});

Deno.test("detect JPG file", async () => {
  const tagView = createTagView(undefined);
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await Deno.readFile("./fixtures/picture.jpg"),
  });

  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/jpeg");
});

Deno.test("detect PNG file", async () => {
  const tagView = createTagView(undefined);
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await Deno.readFile("./fixtures/picture.png"),
  });

  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/png");
});

Deno.test("detect BMP file", async () => {
  const tagView = createTagView(undefined);
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await Deno.readFile("./fixtures/picture.bmp"),
  });

  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/bmp");
});

Deno.test("detect GIF file", async () => {
  const tagView = createTagView(undefined);
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await Deno.readFile("./fixtures/picture.gif"),
  });

  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/gif");
});

Deno.test("detect WebP file", async () => {
  const tagView = createTagView(undefined);
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: await Deno.readFile("./fixtures/picture.webp"),
  });

  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/webp");
});

Deno.test("unknown picture type", () => {
  const tagView = createTagView(undefined);
  const avif = Uint8Array.of(
    0x00,
    0x00,
    0x00,
    0x1C,
    0x66,
    0x74,
    0x79,
    0x70,
    0x61,
    0x76,
    0x69,
    0x66,
  );
  assertThrows(() => {
    tagView.attachPicture({ type: PictureType.FrontCover, picture: avif });
  });

  // specify MIME manually which will disable auto detection
  tagView.attachPicture({
    type: PictureType.FrontCover,
    picture: avif,
    mime: "image/avif",
  });
  assertEquals(tagView.findPicture(PictureType.FrontCover)?.mime, "image/avif");
});
