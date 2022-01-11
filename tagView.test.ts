import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { createTagView, PictureType } from "./mod.ts";

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
