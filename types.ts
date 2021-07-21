export type ID3 = {
  version: {
    major: number;
    revision: number;
  };
  flags: {
    unsynchronisation: boolean;
    isExperimental: boolean;
  };
  frames: Frame[];
};

export enum Preservation {
  Preserved,
  Discarded,
}

export type Frame = TextFrame | AttachedPictureFrame | UnknownFrame;

export interface FrameHeader {
  id: string;
  flags: {
    tagAlterPreservation: Preservation;
    fileAlterPreservation: Preservation;
    readOnly: boolean;
    grouping: boolean;
    compressed: boolean;
    encrypted: boolean;
    unsyrchronised: boolean;
    hasDataLengthIndicator: boolean;
  };
}

export enum FrameContentType {
  Unknown,
  Text,
  AttachedPicture,
}

export type FrameContent<T extends Frame> = Omit<T, keyof FrameHeader>;

export interface TextFrame extends FrameHeader {
  type: FrameContentType.Text;
  encoding: TextEncoding;
  text: string;
}

export enum TextEncoding {
  "ISO-8859-1",
  "UTF-16",
  "UTF-16BE",
  "UTF-8",
}

export interface AttachedPictureFrame extends FrameHeader {
  type: FrameContentType.AttachedPicture;
  mimeType: string;
  pictureType: PictureType;
  description: string;
  picture: Uint8Array;
}

export enum PictureType {
  Other,
  /** 32x32 pixels, PNG only */
  FileIcon,
  OtherFileIcon,
  FrontCover,
  BackCover,
  LeafletPage,
  Media,
  LeadArtist,
  Artist,
  Conductor,
  Orchestra,
  Composer,
  Lyricist,
  RecordingLocation,
  DuringRecording,
  DuringPerformance,
  Movie,
  ABrightColoredFish,
  Illustration,
  ArtistLogotype,
  Publisher,
}

export interface UnknownFrame extends FrameHeader {
  type: FrameContentType.Unknown;
  raw: Uint8Array;
}
