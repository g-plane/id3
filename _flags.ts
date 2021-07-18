//#region header flags
export const FLAG_UNSYNCHRONISATION = 0b1000 << 4;
export const FLAG_EXTENDED_HEADER = 0b0100 << 4;
export const FLAG_EXPERIMENTAL_INDICATOR = 0b0010 << 4;
export const FLAG_FOOTER_PRESENT = 0b0001 << 4;
//#endregion

//#region frame status flags
export const FLAG_TAG_ALTER_PRESERVATION = 0b0100 << 4;
export const FLAG_FILE_ALTER_PRESERVATION = 0b0010 << 4;
export const FLAG_FRAME_READ_ONLY = 0b0001 << 4;
//#endregion

//#region frame format flags
export const FLAG_FRAME_HAS_GROUP = 0b0100 << 4;
export const FLAG_COMPRESSION = 0b1000;
export const FLAG_ENCRYPTION = 0b0100;
export const FLAG_FRAME_UNSYNCHRONISATION = 0b0010;
export const FLAG_DATA_LENGTH_INDICATOR = 0b0001;
//#endregion
