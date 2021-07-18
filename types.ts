export type ID3 = {
  version: {
    major: number;
    revision: number;
  };
  flags: {
    unsynchronisation: boolean;
    isExperimental: boolean;
  };
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
};
