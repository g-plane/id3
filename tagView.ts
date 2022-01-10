import {
  FrameContentType,
  isTextFrame,
  Preservation,
  TextEncoding,
} from "./types.ts";
import type {
  Frame,
  FrameContent,
  FrameHeader,
  ID3,
  TextFrame,
} from "./types.ts";

export interface TagView {
  get title(): string | undefined;
  set title(value: string | undefined | null);
  get artist(): string | undefined;
  set artist(value: string | undefined | null);
  get album(): string | undefined;
  set album(value: string | undefined | null);
  get track(): TrackNumber | undefined;
  set track(value: TrackNumber | undefined | null);
}

export interface TrackNumber {
  current: number;
  total?: number;
}

export function createTagView(id3: ID3 | undefined): TagView {
  const tag = id3 ?? {
    version: { major: 4, revision: 0 },
    flags: {
      unsynchronisation: false,
      isExperimental: false,
    },
    frames: [],
  };

  return {
    get title() {
      return tag.frames
        .find((frame): frame is TextFrame => frame.id === "TIT2")
        ?.text;
    },
    set title(value) {
      setTextFrameValue({ tag, id: "TIT2", value });
    },
    get artist() {
      return tag.frames
        .find((frame): frame is TextFrame => frame.id === "TPE1")
        ?.text;
    },
    set artist(value) {
      setTextFrameValue({ tag, id: "TPE1", value });
    },
    get album() {
      return tag.frames
        .find((frame): frame is TextFrame => frame.id === "TALB")
        ?.text;
    },
    set album(value) {
      setTextFrameValue({ tag, id: "TALB", value });
    },
    get track() {
      const value = tag.frames
        .find((frame): frame is TextFrame => frame.id === "TRCK")
        ?.text;
      if (value === undefined) {
        return value;
      }
      const matches = /^(\d+)(?:\/(\d+))$/.exec(value);
      if (!matches) {
        return undefined;
      }
      const [, current, total] = matches;
      return {
        current: Number.parseInt(current),
        total: total ? Number.parseInt(total) : undefined,
      };
    },
    set track(value) {
      const current = value?.current;
      const total = value?.total;
      setTextFrameValue({
        tag,
        id: "TRCK",
        value: current && total
          ? `${current}/${total}`
          : current
          ? current.toString()
          : undefined,
      });
    },
  };
}

function createFrame<
  T extends FrameContentType,
  F extends Extract<Frame, { type: T }>,
>(
  type: T,
  id: string,
  content: Omit<FrameContent<F>, "type">,
): F {
  const header: FrameHeader = {
    id,
    flags: {
      tagAlterPreservation: Preservation.Preserved,
      fileAlterPreservation: Preservation.Preserved,
      readOnly: false,
      grouping: false,
      compressed: false,
      encrypted: false,
      unsyrchronised: false,
      hasDataLengthIndicator: false,
    },
  };
  return { ...header, type, ...content } as F;
}

const TEXT_FRAME_INSERTION_ORDER = [
  "TIT2",
  "TPE1",
  "TALB",
  "TRCK",
  "TYER",
  "TCON",
];

function setTextFrameValue(
  { tag, id, value }: {
    tag: ID3;
    id: string;
    value: string | undefined | null;
  },
) {
  if (value == null) {
    tag.frames = tag.frames.filter((frame) => frame.id !== id);
    return;
  }

  const frame = tag.frames
    .find((frame): frame is TextFrame => frame.id === id);
  if (frame) {
    frame.text = value;
  } else {
    const frame = createFrame(FrameContentType.Text, id, {
      encoding: tag.version.major >= 4
        ? TextEncoding["UTF-8"]
        : TextEncoding["UTF-16"],
      text: value,
    });

    const index = TEXT_FRAME_INSERTION_ORDER.indexOf(frame.id);
    if (index < 0 || index === TEXT_FRAME_INSERTION_ORDER.length - 1) {
      const index = tag.frames.findLastIndex(isTextFrame);
      if (index < 0) {
        tag.frames.unshift(frame);
      } else {
        tag.frames.splice(index, 0, frame);
      }
    } else {
      let index = -1;
      for (const id of TEXT_FRAME_INSERTION_ORDER) {
        index = tag.frames.findIndex((frame) => frame.id === id);
      }
      if (index === -1) {
        tag.frames.unshift(frame);
      } else {
        tag.frames.splice(index, 0, frame);
      }
    }
  }
}
