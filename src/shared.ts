export function hasID3(bytes: Uint8Array): boolean {
  return (
    bytes[0] === /* "I" */ 0x49 &&
    bytes[1] === /* "D" */ 0x44 &&
    bytes[2] === /* "3" */ 0x33
  )
}

export function readTagSize(bytes: Uint8Array): number {
  return (bytes[0] << 21) + (bytes[1] << 14) + (bytes[2] << 7) + bytes[3]
}
