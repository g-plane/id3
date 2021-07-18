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

export type Frame = {
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
  content: FrameContent;
};

export enum FrameContentType {
  Text,
  Unknown,
}

export type FrameContent = TextFrameContent | UnknownFrameContent;

export type TextFrameContent = {
  type: FrameContentType.Text;
  encoding: TextEncoding;
  text: string;
};

export enum TextEncoding {
  "ISO-8859-1",
  "UTF-16",
  "UTF-16BE",
  "UTF-8",
}

export type UnknownFrameContent = {
  type: FrameContentType.Unknown;
};
