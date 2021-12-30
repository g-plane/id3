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

export type Frame =
  | TextFrame
  | AttachedPictureFrame
  | CommentFrame
  | UnsynchronisedLyricsFrame
  | URLLinkFrame
  | UserDefinedTextFrame
  | PrivateFrame
  | UnknownFrame;

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
  Comment,
  URLLink,
  UnsynchronisedLyrics,
  UserDefinedText,
  Private,
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

export interface CommentFrame extends FrameHeader {
  type: FrameContentType.Comment;
  encoding: TextEncoding;
  language: string;
  description: string;
  text: string;
}

export interface URLLinkFrame extends FrameHeader {
  type: FrameContentType.URLLink;
  url: string;
}

export interface UnsynchronisedLyricsFrame extends FrameHeader {
  type: FrameContentType.UnsynchronisedLyrics;
  encoding: TextEncoding;
  language: string;
  descriptor: string;
  lyrics: string;
}

export interface UserDefinedTextFrame extends FrameHeader {
  type: FrameContentType.UserDefinedText;
  encoding: TextEncoding;
  description: string;
  text: string;
}

export interface PrivateFrame extends FrameHeader {
  type: FrameContentType.Private;
  identifier: string;
  data: Uint8Array;
}

export interface UnknownFrame extends FrameHeader {
  type: FrameContentType.Unknown;
  raw: Uint8Array;
}
