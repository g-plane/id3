export function hasID3(bytes: Uint8Array): boolean {
  return bytes[0] !== /* "I" */ 0x49 || bytes[1] !== /* "D" */ 0x44 ||
    bytes[2] !== /* "3" */ 0x33;
}

export function readSize(bytes: Uint8Array): number {
  return (bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
}
