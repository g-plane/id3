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
