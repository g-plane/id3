import {
  FrameContentType,
  PictureType,
  Preservation,
  TextEncoding,
} from "./types.ts";
import type {
  AttachedPictureFrame,
  CommentFrame,
  Frame,
  FrameContent,
  FrameHeader,
  ID3,
  TextFrame,
  UnknownFrame,
  UnsynchronisedLyricsFrame,
  UserDefinedTextFrame,
} from "./types.ts";
import * as flags from "./_flags.ts";

function countSize(bytes: Uint8Array): number {
  return (bytes[0] << 21) + (bytes[1] << 14) + (bytes[2] << 7) + bytes[3];
}

export function parse(bytes: Uint8Array): ID3 | undefined {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return undefined;
  }

  const majorVersion = bytes[3];
  const revision = bytes[4];

  const headerFlags = bytes[5];
  const unsynchronisation = !!(headerFlags & flags.FLAG_UNSYNCHRONISATION);
  const hasExtendedHeader = headerFlags & flags.FLAG_EXTENDED_HEADER;
  const isExperimental = !!(headerFlags & flags.FLAG_EXPERIMENTAL_INDICATOR);
  const hasFooter = headerFlags & flags.FLAG_FOOTER_PRESENT;

  const tagSize = countSize(bytes.subarray(6));
  let offset = 10;

  const extendedHeaderSize = hasExtendedHeader
    ? skipExtenedHeader(bytes.subarray(offset))
    : 0;
  offset += extendedHeaderSize;

  const frames = parseFrames(
    bytes.subarray(offset, offset + (tagSize - extendedHeaderSize)),
  );

  return {
    version: {
      major: majorVersion,
      revision,
    },
    flags: {
      unsynchronisation,
      isExperimental,
    },
    frames,
  };
}

function skipExtenedHeader(bytes: Uint8Array) {
  return countSize(bytes);
}

function peekIsPadding(bytes: Uint8Array, offset: number): boolean {
  return bytes[offset] === 0 && bytes[offset + 1] === 0 &&
    bytes[offset + 2] === 0 && bytes[offset + 3] === 0;
}

function parseFrames(bytes: Uint8Array): Frame[] {
  let offset = 0;
  const frames: Frame[] = [];

  while (
    offset < bytes.length && !peekIsPadding(bytes, offset)
  ) {
    const [frameSize, frame] = parseFrame(bytes.subarray(offset));
    frames.push(frame);
    offset += 10 + frameSize;
  }

  return frames;
}

function parseFrame(bytes: Uint8Array): [size: number, frame: Frame] {
  const defaultDecoder = new TextDecoder("ISO-8859-1");

  const id = defaultDecoder.decode(bytes.subarray(0, 4));
  const size = countSize(bytes.subarray(4));

  const statusFlags = bytes[8];
  const formatFlags = bytes[9];

  const frameHeader: FrameHeader = {
    id,
    flags: {
      tagAlterPreservation: statusFlags & flags.FLAG_TAG_ALTER_PRESERVATION
        ? Preservation.Discarded
        : Preservation.Preserved,
      fileAlterPreservation: statusFlags & flags.FLAG_FILE_ALTER_PRESERVATION
        ? Preservation.Discarded
        : Preservation.Preserved,
      readOnly: !!(statusFlags & flags.FLAG_FRAME_READ_ONLY),
      grouping: !!(formatFlags & flags.FLAG_FRAME_HAS_GROUP),
      compressed: !!(formatFlags & flags.FLAG_COMPRESSION),
      encrypted: !!(formatFlags & flags.FLAG_ENCRYPTION),
      unsyrchronised: !!(formatFlags & flags.FLAG_FRAME_UNSYNCHRONISATION),
      hasDataLengthIndicator:
        !!(formatFlags & flags.FLAG_DATA_LENGTH_INDICATOR),
    },
  };

  const content = (() => {
    const frameContent = bytes.subarray(10, 10 + size);

    if (id.startsWith("T") && id !== "TXXX") {
      return parseTextFrameContent(frameContent);
    } else if (id === "APIC") {
      return parseAttachedPictureFrameContent(frameContent);
    } else if (id === "COMM") {
      return parseCommentFrameContent(frameContent);
    } else if (id === "USLT") {
      return parseUnsynchronisedLyricsFrame(frameContent);
    } else if (id === "TXXX") {
      return parseUserDefinedTextFrameContent(frameContent);
    } else {
      return parseUnknownFrameContent(frameContent);
    }
  })();

  const frame: Frame = markToStringTag(Object.assign(frameHeader, content));

  return [size, frame];
}

function parseTextFrameContent(bytes: Uint8Array): FrameContent<TextFrame> {
  const encoding: TextEncoding = bytes[0];
  const decoder = new TextDecoder(TextEncoding[encoding]);

  const terminatorCount =
    encoding === TextEncoding["UTF-16"] || encoding === TextEncoding["UTF-16BE"]
      ? 2
      : 1;

  return {
    type: FrameContentType.Text,
    encoding,
    text: decoder.decode(
      bytes.subarray(1, bytes.length - terminatorCount),
    ),
  };
}

function parseAttachedPictureFrameContent(
  bytes: Uint8Array,
): FrameContent<AttachedPictureFrame> {
  const encoding: TextEncoding = bytes[0];

  let offset = 1 + bytes.subarray(1).indexOf(0);
  const defaultDecoder = new TextDecoder("ISO-8859-1");
  const mimeType = defaultDecoder.decode(bytes.subarray(1, offset));

  offset += 1;
  const pictureType: PictureType = bytes[offset];

  offset += 1;
  const descriptionSize = bytes.subarray(offset).indexOf(0);
  const decoder = new TextDecoder(TextEncoding[encoding]);
  const description = decoder.decode(
    bytes.subarray(offset, offset + descriptionSize),
  );

  const picture = bytes.slice(offset + descriptionSize + 1);

  return {
    type: FrameContentType.AttachedPicture,
    mimeType,
    pictureType,
    description,
    picture,
  };
}

function parseCommentFrameContent(
  bytes: Uint8Array,
): FrameContent<CommentFrame> {
  const encoding: TextEncoding = bytes[0];

  const defaultDecoder = new TextDecoder("ISO-8859-1");
  const language = defaultDecoder.decode(bytes.subarray(1, 4));

  const decoder = new TextDecoder(TextEncoding[encoding]);
  const descriptionSize = bytes.subarray(4).indexOf(0);
  let offset = 4 + descriptionSize;
  const description = decoder.decode(bytes.subarray(4, offset));

  offset += 1;
  if (bytes[offset] === 0) {
    offset += 1;
  }

  const text = decoder.decode(bytes.subarray(offset, bytes.length - 1));

  return {
    type: FrameContentType.Comment,
    encoding,
    language,
    description,
    text,
  };
}

function parseUnsynchronisedLyricsFrame(
  bytes: Uint8Array,
): FrameContent<UnsynchronisedLyricsFrame> {
  const encoding: TextEncoding = bytes[0];

  const defaultDecoder = new TextDecoder("ISO-8859-1");
  const language = defaultDecoder.decode(bytes.subarray(1, 4));

  const decoder = new TextDecoder(TextEncoding[encoding]);
  const descriptorSize = bytes.subarray(4).indexOf(0);
  let offset = 4 + descriptorSize;
  const descriptor = decoder.decode(bytes.subarray(4, offset));

  offset += 1;
  if (bytes[offset] === 0) {
    offset += 1;
  }

  const lyrics = decoder.decode(bytes.subarray(offset, bytes.length - 1));

  return {
    type: FrameContentType.UnsynchronisedLyrics,
    encoding,
    language,
    descriptor,
    lyrics,
  };
}

function parseUserDefinedTextFrameContent(
  bytes: Uint8Array,
): FrameContent<UserDefinedTextFrame> {
  const encoding: TextEncoding = bytes[0];
  const decoder = new TextDecoder(TextEncoding[encoding]);

  const descriptionSize = bytes.subarray(1).indexOf(0);
  let offset = 1 + descriptionSize;
  const description = decoder.decode(bytes.subarray(1, offset));

  offset += 1;
  if (bytes[offset] === 0) {
    offset += 1;
  }

  const text = decoder.decode(bytes.subarray(offset, bytes.length - 1));

  return {
    type: FrameContentType.UserDefinedText,
    encoding,
    description,
    text,
  };
}

function parseUnknownFrameContent(
  bytes: Uint8Array,
): FrameContent<UnknownFrame> {
  return {
    type: FrameContentType.Unknown,
    raw: bytes.slice(),
  };
}

function markToStringTag<T extends FrameContent<Frame>>(content: T): T {
  switch (content.type) {
    case FrameContentType.Unknown:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "UnknownFrame",
        enumerable: false,
      });
    case FrameContentType.Text:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "TextFrame",
        enumerable: false,
      });
    case FrameContentType.AttachedPicture:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "AttachedPictureFrame",
        enumerable: false,
      });
    case FrameContentType.Comment:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "CommentFrame",
        enumerable: false,
      });
    case FrameContentType.UnsynchronisedLyrics:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "UnsynchronisedLyricsFrame",
        enumerable: false,
      });
    case FrameContentType.UserDefinedText:
      return Object.defineProperty(content, Symbol.toStringTag, {
        value: "UserDefinedTextFrame",
        enumerable: false,
      });
  }
}
