import type { ID3 } from "./types.ts";

const FLAG_UNSYNCHRONISATION = 0b1000 << 4;
const FLAG_EXTENDED_HEADER = 0b0100 << 4;
const FLAG_EXPERIMENTAL_INDICATOR = 0b0010 << 4;
const FLAG_FOOTER_PRESENT = 0b0001 << 4;

function countSize(bytes: Uint8Array): number {
  return (bytes[0] << 21) + (bytes[1] << 14) + (bytes[2] << 7) + bytes[3];
}

export function parse(bytes: Uint8Array): ID3 {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    throw new Error(); // TODO: not an error
  }

  const majorVersion = bytes[3];
  const revision = bytes[4];

  const flags = bytes[5];
  const unsynchronisation = !!(flags & FLAG_UNSYNCHRONISATION);
  const hasExtendedHeader = flags & FLAG_EXTENDED_HEADER;
  const isExperimental = !!(flags & FLAG_EXPERIMENTAL_INDICATOR);
  const hasFooter = flags & FLAG_FOOTER_PRESENT;

  const dataView = new DataView(bytes.buffer);

  const tagSize = countSize(bytes.subarray(6));

  if (hasExtendedHeader) {
    parseExtenedHeader(bytes.subarray(10));
  }

  parseFrames(bytes.subarray(10, 10 + tagSize));

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

function parseExtenedHeader(bytes: Uint8Array) {
  //
}

function parseFrames(bytes: Uint8Array) {
  let parsedSize = 0;
  const dataView = new DataView(bytes.buffer);

  while (
    parsedSize < bytes.length && !peekIsPadding(bytes, parsedSize)
  ) {
    const [frameSize] = parseFrame(bytes.subarray(parsedSize));
    parsedSize += 10 + frameSize;
  }
}

function parseFrame(bytes: Uint8Array): [size: number] {
  const decoder = new TextDecoder("utf8");

  const id = decoder.decode(bytes.subarray(0, 4));
  const size = countSize(bytes.subarray(4));

  return [size];
}

function peekIsPadding(bytes: Uint8Array, offset: number): boolean {
  return bytes[offset] === 0 && bytes[offset + 1] === 0 &&
    bytes[offset + 2] === 0 && bytes[offset + 3] === 0;
}
