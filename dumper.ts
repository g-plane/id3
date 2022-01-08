import { concat } from "https://deno.land/std@0.120.0/bytes/mod.ts";
import { FrameContentType, Preservation, TextEncoding } from "./types.ts";
import type {
  AttachedPictureFrame,
  CommentFrame,
  Frame,
  ID3,
  PrivateFrame,
  TextFrame,
  UnknownFrame,
  UnsynchronisedLyricsFrame,
  URLLinkFrame,
  UserDefinedTextFrame,
} from "./types.ts";
import {
  FLAG_DATA_LENGTH_INDICATOR,
  FLAG_EXPERIMENTAL_INDICATOR,
  FLAG_FILE_ALTER_PRESERVATION,
  FLAG_FRAME_HAS_GROUP,
  FLAG_FRAME_READ_ONLY,
  FLAG_FRAME_UNSYNCHRONISATION,
  FLAG_TAG_ALTER_PRESERVATION,
  FLAG_UNSYNCHRONISATION,
} from "./_flags.ts";
import { hasID3, readTagSize } from "./_shared.ts";

const textEncoder = new TextEncoder();

function encodeText(text: string, encoding: TextEncoding): Uint8Array {
  switch (encoding) {
    case TextEncoding["ISO-8859-1"]:
    case TextEncoding["UTF-8"]:
      return textEncoder.encode(text);
    case TextEncoding["UTF-16"]:
    case TextEncoding["UTF-16BE"]: {
      const bytes = new Uint8Array(text.length * 2 + 2);
      bytes[0] = 255;
      bytes[1] = 254;
      for (let i = 0; i < text.length; i += 1) {
        const c = text.charCodeAt(i);
        bytes[(i + 1) * 2] = c & 255;
        bytes[(i + 1) * 2 + 1] = c >> 8;
      }
      return bytes;
    }
  }
}

export function dump(id3: ID3, originalBytes: Uint8Array): Uint8Array {
  const rest = originalBytes.slice(
    hasID3(originalBytes) ? (readTagSize(originalBytes.subarray(6)) + 10) : 0,
  );

  const frames = id3.frames.map((frame) => dumpFrame(frame, id3.version.major));
  const tagSize = frames
    .map((frame) => frame.length)
    .reduce((total, size) => total + size, 0);

  return concat(
    textEncoder.encode("ID3"),
    dumpVersion(id3),
    dumpHeaderFlags(id3),
    dumpTagSize(tagSize),
    ...frames,
    rest,
  );
}

function dumpVersion({ version }: ID3): Uint8Array {
  return Uint8Array.of(version.major, version.revision);
}

function dumpHeaderFlags({ flags }: ID3): Uint8Array {
  let flagsByte = 0;
  flagsByte += flags.unsynchronisation ? FLAG_UNSYNCHRONISATION : 0;
  flagsByte += flags.isExperimental ? FLAG_EXPERIMENTAL_INDICATOR : 0;

  return Uint8Array.of(flagsByte);
}

function dumpTagSize(size: number): Uint8Array {
  const mask = 0b01111111;
  return Uint8Array.of(
    (size >> 21) & mask,
    (size >> 14) & mask,
    (size >> 7) & mask,
    size & mask,
  );
}

function dumpSize(size: number, version: number): Uint8Array {
  if (version >= 4) {
    return dumpTagSize(size);
  }

  const mask = 0b11111111;
  return Uint8Array.of(
    (size >> 24) & mask,
    (size >> 16) & mask,
    (size >> 8) & mask,
    size & mask,
  );
}

function dumpEncoding(encoding: TextEncoding): Uint8Array {
  switch (encoding) {
    case TextEncoding["ISO-8859-1"]:
      return Uint8Array.of(TextEncoding["ISO-8859-1"]);
    case TextEncoding["UTF-8"]:
      return Uint8Array.of(TextEncoding["UTF-8"]);
    case TextEncoding["UTF-16"]:
    case TextEncoding["UTF-16BE"]:
      return Uint8Array.of(TextEncoding["UTF-16"]);
  }
}

function dumpTerminator(encoding: TextEncoding): Uint8Array {
  switch (encoding) {
    case TextEncoding["ISO-8859-1"]:
    case TextEncoding["UTF-8"]:
      return new Uint8Array(1);
    case TextEncoding["UTF-16"]:
    case TextEncoding["UTF-16BE"]:
      return new Uint8Array(2);
  }
}

function dumpFrame(frame: Frame, version: number): Uint8Array {
  let statusFlags = 0;
  if (frame.flags.tagAlterPreservation === Preservation.Discarded) {
    statusFlags += FLAG_TAG_ALTER_PRESERVATION;
  }
  if (frame.flags.fileAlterPreservation === Preservation.Discarded) {
    statusFlags += FLAG_FILE_ALTER_PRESERVATION;
  }
  if (frame.flags.readOnly) {
    statusFlags += FLAG_FRAME_READ_ONLY;
  }

  let formatFlags = 0;
  if (frame.flags.grouping) {
    formatFlags += FLAG_FRAME_HAS_GROUP;
  }
  if (frame.flags.unsyrchronised) {
    formatFlags += FLAG_FRAME_UNSYNCHRONISATION;
  }
  if (frame.flags.hasDataLengthIndicator) {
    formatFlags += FLAG_DATA_LENGTH_INDICATOR;
  }

  const frameContent = (() => {
    switch (frame.type) {
      case FrameContentType.Text:
        return dumpTextFrame(frame);
      case FrameContentType.AttachedPicture:
        return dumpAttachedPictureFrame(frame);
      case FrameContentType.Comment:
        return dumpCommentFrame(frame);
      case FrameContentType.URLLink:
        return dumpURLLinkFrame(frame);
      case FrameContentType.UnsynchronisedLyrics:
        return dumpUnsynchronisedLyricsFrame(frame);
      case FrameContentType.UserDefinedText:
        return dumpUserDefinedTextFrame(frame);
      case FrameContentType.Private:
        return dumpPrivateFrame(frame);
      case FrameContentType.Unknown:
        return dumpUnknownFrame(frame);
    }
  })();

  return concat(
    textEncoder.encode(frame.id),
    dumpSize(frameContent.length, version),
    Uint8Array.of(statusFlags, formatFlags),
    frameContent,
  );
}

function dumpTextFrame(frame: TextFrame): Uint8Array {
  return concat(
    dumpEncoding(frame.encoding),
    encodeText(frame.text, frame.encoding),
  );
}

function dumpAttachedPictureFrame(frame: AttachedPictureFrame): Uint8Array {
  return concat(
    dumpEncoding(frame.encoding),
    textEncoder.encode(frame.mimeType),
    Uint8Array.of(0),
    Uint8Array.of(frame.pictureType),
    encodeText(frame.description, frame.encoding),
    dumpTerminator(frame.encoding),
    frame.picture,
  );
}

function dumpCommentFrame(frame: CommentFrame): Uint8Array {
  return concat(
    dumpEncoding(frame.encoding),
    textEncoder.encode(frame.language),
    encodeText(frame.description, frame.encoding),
    dumpTerminator(frame.encoding),
    encodeText(frame.text, frame.encoding),
  );
}

function dumpURLLinkFrame(frame: URLLinkFrame): Uint8Array {
  return textEncoder.encode(frame.url);
}

function dumpUnsynchronisedLyricsFrame(
  frame: UnsynchronisedLyricsFrame,
): Uint8Array {
  return concat(
    dumpEncoding(frame.encoding),
    textEncoder.encode(frame.language),
    encodeText(frame.descriptor, frame.encoding),
    dumpTerminator(frame.encoding),
    encodeText(frame.lyrics, frame.encoding),
  );
}

function dumpUserDefinedTextFrame(frame: UserDefinedTextFrame): Uint8Array {
  return concat(
    dumpEncoding(frame.encoding),
    textEncoder.encode(frame.description),
    dumpTerminator(frame.encoding),
    encodeText(frame.text, frame.encoding),
  );
}

function dumpPrivateFrame(frame: PrivateFrame): Uint8Array {
  return concat(
    textEncoder.encode(frame.identifier),
    Uint8Array.of(0),
    frame.data,
  );
}

function dumpUnknownFrame(frame: UnknownFrame): Uint8Array {
  return frame.raw;
}
