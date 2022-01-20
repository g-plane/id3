import { equals } from "https://deno.land/std@0.120.0/bytes/mod.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.120.0/testing/asserts.ts";
import {
  isAttachedPictureFrame,
  isCommentFrame,
  isTextFrame,
  parse,
  PictureType,
  TextEncoding,
} from "./mod.ts";
import type { AttachedPictureFrame, TextFrame } from "./mod.ts";

Deno.test("accept file without ID3 tag", () => {
  assertEquals(parse(Uint8Array.of(1, 2, 3, 4, 5)), undefined);
});

Deno.test("recognize ID3 version", async () => {
  const v2_4 = parse(await Deno.readFile("./fixtures/id3v2.4.mp3"))!;
  assertEquals(v2_4.version.major, 4);
  assertEquals(v2_4.version.revision, 0);

  const v2_3 = parse(await Deno.readFile("./fixtures/id3v2.3.mp3"))!;
  assertEquals(v2_3.version.major, 3);
  assertEquals(v2_3.version.revision, 0);
});

Deno.test("parse frame ID", async () => {
  const v2_4 = parse(await Deno.readFile("./fixtures/id3v2.4.mp3"))!;
  assertEquals(v2_4.frames.map(({ id }) => id), [
    "TSSE",
    "TIT2",
    "TPE1",
    "TALB",
    "TDRC",
    "TRCK",
    "TCON",
    "COMM",
    "APIC",
    "APIC",
  ]);

  const v2_3 = parse(await Deno.readFile("./fixtures/id3v2.3.mp3"))!;
  assertEquals(v2_3.frames.map(({ id }) => id), [
    "TIT2",
    "TPE1",
    "TALB",
    "TYER",
    "TRCK",
    "TCON",
    "COMM",
    "APIC",
    "APIC",
  ]);
});

Deno.test("parse text frame", async () => {
  const v2_4 = parse(await Deno.readFile("./fixtures/id3v2.4.mp3"))!;
  const v2_4title = v2_4.frames.find((frame): frame is TextFrame =>
    isTextFrame(frame) && frame.id === "TIT2"
  )!;
  assertEquals(v2_4title.encoding, TextEncoding["UTF-8"]);
  assertEquals(v2_4title.text, "v2.4 title");
  const v2_4album = v2_4.frames.find((frame): frame is TextFrame =>
    isTextFrame(frame) && frame.id === "TALB"
  )!;
  assertEquals(v2_4album.encoding, TextEncoding["UTF-8"]);
  assertEquals(v2_4album.text, "某专辑");

  const v2_3 = parse(await Deno.readFile("./fixtures/id3v2.3.mp3"))!;
  const v2_3title = v2_3.frames.find((frame): frame is TextFrame =>
    isTextFrame(frame) && frame.id === "TIT2"
  )!;
  assertEquals(v2_3title.encoding, TextEncoding["ISO-8859-1"]);
  assertEquals(v2_3title.text, "v2.3 title");
  const v2_3album = v2_3.frames.find((frame): frame is TextFrame =>
    isTextFrame(frame) && frame.id === "TALB"
  )!;
  assertEquals(v2_3album.encoding, TextEncoding["UTF-16"]);
  assertEquals(v2_3album.text, "某专辑");
});

Deno.test("parse comment frame", async () => {
  const v2_4 = parse(await Deno.readFile("./fixtures/id3v2.4.mp3"))!;
  const v2_4comment = v2_4.frames.find(isCommentFrame)!;
  assertEquals(v2_4comment.encoding, TextEncoding["UTF-8"]);
  assertEquals(v2_4comment.language, "XXX");
  assertEquals(v2_4comment.description, "");
  assertEquals(v2_4comment.text, "comment here 这是注释");

  const v2_3 = parse(await Deno.readFile("./fixtures/id3v2.3.mp3"))!;
  const v2_3comment = v2_3.frames.find(isCommentFrame)!;
  assertEquals(v2_3comment.encoding, TextEncoding["UTF-16"]);
  assertEquals(v2_3comment.language, "\x00\x00\x00");
  assertEquals(v2_3comment.description, "");
  assertEquals(v2_3comment.text, "comment here 这是注释");
});

Deno.test("parse attached picture frame", async () => {
  const frontCover = await Deno.readFile("./fixtures/picture.jpg");
  const backCover = await Deno.readFile("./fixtures/picture.png");

  const v2_4 = parse(await Deno.readFile("./fixtures/id3v2.4.mp3"))!;
  const v2_4front = v2_4.frames.find((frame): frame is AttachedPictureFrame =>
    isAttachedPictureFrame(frame) &&
    frame.pictureType === PictureType.FrontCover
  )!;
  assertEquals(v2_4front.encoding, TextEncoding["UTF-8"]);
  assertEquals(v2_4front.mimeType, "image/jpeg");
  assertEquals(v2_4front.description, "front cover");
  assert(
    equals(v2_4front.picture, frontCover),
    "picture does not match as expected",
  );
  const v2_4back = v2_4.frames.find((frame): frame is AttachedPictureFrame =>
    isAttachedPictureFrame(frame) &&
    frame.pictureType === PictureType.BackCover
  )!;
  assertEquals(v2_4back.encoding, TextEncoding["UTF-8"]);
  assertEquals(v2_4back.mimeType, "image/png");
  assertEquals(v2_4back.description, "这是一张图片");
  assert(
    equals(v2_4back.picture, backCover),
    "picture does not match as expected",
  );

  const v2_3 = parse(await Deno.readFile("./fixtures/id3v2.3.mp3"))!;
  const v2_3front = v2_3.frames.find((frame): frame is AttachedPictureFrame =>
    isAttachedPictureFrame(frame) &&
    frame.pictureType === PictureType.FrontCover
  )!;
  assertEquals(v2_3front.encoding, TextEncoding["ISO-8859-1"]);
  assertEquals(v2_3front.mimeType, "image/jpeg");
  assertEquals(v2_3front.description, "front cover");
  assert(
    equals(v2_3front.picture, frontCover),
    "picture does not match as expected",
  );
  const v2_3back = v2_3.frames.find((frame): frame is AttachedPictureFrame =>
    isAttachedPictureFrame(frame) &&
    frame.pictureType === PictureType.BackCover
  )!;
  assertEquals(v2_3back.encoding, TextEncoding["UTF-16"]);
  assertEquals(v2_3back.mimeType, "image/png");
  assertEquals(v2_3back.description, "这是一张图片");
  assert(
    equals(v2_3back.picture, backCover),
    "picture does not match as expected",
  );
});
