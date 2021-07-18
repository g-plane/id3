import { Preservation } from "./types.ts";
import type { Frame, ID3 } from "./types.ts";
import * as flags from "./_flags.ts";

function countSize(bytes: Uint8Array): number {
  return (bytes[0] << 21) + (bytes[1] << 14) + (bytes[2] << 7) + bytes[3];
}

export function parse(bytes: Uint8Array): ID3 {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    throw new Error(); // TODO: not an error
  }

  const majorVersion = bytes[3];
  const revision = bytes[4];

  const headerFlags = bytes[5];
  const unsynchronisation = !!(headerFlags & flags.FLAG_UNSYNCHRONISATION);
  const hasExtendedHeader = headerFlags & flags.FLAG_EXTENDED_HEADER;
  const isExperimental = !!(headerFlags & flags.FLAG_EXPERIMENTAL_INDICATOR);
  const hasFooter = headerFlags & flags.FLAG_FOOTER_PRESENT;

  const dataView = new DataView(bytes.buffer);

  const tagSize = countSize(bytes.subarray(6));
  let offset = 10;

  const extendedHeaderSize = hasExtendedHeader
    ? skipExtenedHeader(bytes.subarray(offset))
    : 0;
  offset += extendedHeaderSize;

  parseFrames(bytes.subarray(offset, offset + (tagSize - extendedHeaderSize)));

  return {
    version: {
      major: majorVersion,
      revision,
    },
    flags: {
      unsynchronisation,
      isExperimental,
    },
  };
}

function skipExtenedHeader(bytes: Uint8Array) {
  return countSize(bytes);
}

function parseFrames(bytes: Uint8Array) {
  let offset = 0;
  const dataView = new DataView(bytes.buffer);

  while (
    offset < bytes.length && !peekIsPadding(bytes, offset)
  ) {
    const [frameSize] = parseFrame(bytes.subarray(offset));
    offset += 10 + frameSize;
  }
}

function parseFrame(bytes: Uint8Array): [size: number, frame: Frame] {
  const decoder = new TextDecoder("utf8");

  const id = decoder.decode(bytes.subarray(0, 4));
  const size = countSize(bytes.subarray(4));

  const statusFlags = bytes[8];
  const formatFlags = bytes[9];

  const frame: Frame = {
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

  return [size, frame];
}

function peekIsPadding(bytes: Uint8Array, offset: number): boolean {
  return bytes[offset] === 0 && bytes[offset + 1] === 0 &&
    bytes[offset + 2] === 0 && bytes[offset + 3] === 0;
}
