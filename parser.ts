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
  PrivateFrame,
  TextFrame,
  UnknownFrame,
  UnsynchronisedLyricsFrame,
  URLLinkFrame,
  UserDefinedTextFrame,
} from "./types.ts";
import * as flags from "./_flags.ts";
import { hasID3, readTagSize } from "./_shared.ts";

export function parse(bytes: Uint8Array): ID3 | undefined {
  if (!hasID3(bytes)) {
    return undefined;
  }

  const majorVersion = bytes[3];
  const revision = bytes[4];

  const headerFlags = bytes[5];
  const unsynchronisation = !!(headerFlags & flags.FLAG_UNSYNCHRONISATION);
  const hasExtendedHeader = headerFlags & flags.FLAG_EXTENDED_HEADER;
  const isExperimental = !!(headerFlags & flags.FLAG_EXPERIMENTAL_INDICATOR);

  const tagSize = readTagSize(bytes.subarray(6));
  let offset = 10;

  const extendedHeaderSize = hasExtendedHeader
    ? skipExtenedHeader(bytes.subarray(offset), majorVersion)
    : 0;
  offset += extendedHeaderSize;

  const frames = parseFrames(bytes.subarray(offset), {
    totalFramesSize: offset + (tagSize - extendedHeaderSize),
    version: majorVersion,
  });

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

function readSize(bytes: Uint8Array, version: number): number {
  if (version >= 4) {
    return (bytes[0] << 21) + (bytes[1] << 14) + (bytes[2] << 7) + bytes[3];
  } else {
    return (bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
  }
}

function skipExtenedHeader(bytes: Uint8Array, version: number) {
  return readSize(bytes, version);
}

function peekIsPadding(bytes: Uint8Array, offset: number): boolean {
  return bytes[offset] === 0 && bytes[offset + 1] === 0 &&
    bytes[offset + 2] === 0 && bytes[offset + 3] === 0;
}

function findTerminatorIndex(
  encoding: TextEncoding,
  bytes: Uint8Array,
): number {
  switch (encoding) {
    case TextEncoding["ISO-8859-1"]:
    case TextEncoding["UTF-8"]:
      return bytes.indexOf(0);
    case TextEncoding["UTF-16"]:
    case TextEncoding["UTF-16BE"]:
      return bytes.findIndex((byte, index, bytes) =>
        byte === 0 && bytes[index + 1] === 0
      );
  }
}

function skipTerminator(encoding: TextEncoding): number {
  switch (encoding) {
    case TextEncoding["ISO-8859-1"]:
    case TextEncoding["UTF-8"]:
      return 1;
    case TextEncoding["UTF-16"]:
    case TextEncoding["UTF-16BE"]:
      return 2;
  }
}

function parseFrames(
  bytes: Uint8Array,
  options: { totalFramesSize: number; version: number },
): Frame[] {
  let offset = 0;
  const frames: Frame[] = [];

  while (
    offset < options.totalFramesSize && !peekIsPadding(bytes, offset)
  ) {
    const [frameSize, frame] = parseFrame(bytes.subarray(offset), options);
    frames.push(frame);
    offset += 10 + frameSize;
  }

  return frames;
}

function parseFrame(
  bytes: Uint8Array,
  { version }: { version: number },
): [size: number, frame: Frame] {
  const defaultDecoder = new TextDecoder("ISO-8859-1");

  const id = defaultDecoder.decode(bytes.subarray(0, 4));
  const size = readSize(bytes.subarray(4), version);

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
    } else if (id === "PRIV") {
      return parsePrivateFrame(frameContent);
    } else if (id.startsWith("W") && id !== "WXXX") {
      return parseURLLinkFrame(frameContent);
    } else {
      return parseUnknownFrameContent(frameContent);
    }
  })();

  return [size, Object.assign(frameHeader, content)];
}

function parseTextFrameContent(bytes: Uint8Array): FrameContent<TextFrame> {
  const encoding: TextEncoding = bytes[0];
  const decoder = new TextDecoder(TextEncoding[encoding]);

  return {
    type: FrameContentType.Text,
    encoding,
    // deno-lint-ignore no-control-regex
    text: decoder.decode(bytes.subarray(1)).replace(/\x00*$/, ""),
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
  const descriptionSize = findTerminatorIndex(encoding, bytes.subarray(offset));
  const decoder = new TextDecoder(TextEncoding[encoding]);
  const description = decoder.decode(
    bytes.subarray(offset, offset + descriptionSize),
  );

  offset += descriptionSize + skipTerminator(encoding);

  const picture = bytes.slice(offset);

  return {
    type: FrameContentType.AttachedPicture,
    encoding,
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
  const descriptionSize = findTerminatorIndex(encoding, bytes.subarray(4));
  let offset = 4 + descriptionSize;
  const description = decoder.decode(bytes.subarray(4, offset));

  offset += skipTerminator(encoding);

  const text = decoder.decode(bytes.subarray(offset));

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

  const lyrics = decoder.decode(bytes.subarray(offset));

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

  const text = decoder.decode(bytes.subarray(offset));

  return {
    type: FrameContentType.UserDefinedText,
    encoding,
    description,
    text,
  };
}

function parsePrivateFrame(bytes: Uint8Array): FrameContent<PrivateFrame> {
  const separator = bytes.indexOf(0);

  const defaultDecoder = new TextDecoder("ISO-8859-1");
  const identifier = defaultDecoder.decode(bytes.subarray(0, separator));
  const data = bytes.slice(separator + 1);

  return {
    type: FrameContentType.Private,
    identifier,
    data,
  };
}

function parseURLLinkFrame(bytes: Uint8Array): FrameContent<URLLinkFrame> {
  const decoder = new TextDecoder();

  return {
    type: FrameContentType.URLLink,
    url: decoder.decode(bytes),
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
