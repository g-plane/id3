import { FrameContentType } from "./types.ts";
import type {
  AttachedPictureFrame,
  CommentFrame,
  Frame,
  PrivateFrame,
  TextFrame,
  UnknownFrame,
  UnsynchronisedLyricsFrame,
  URLLinkFrame,
  UserDefinedTextFrame,
} from "./types.ts";

export function isUnknownFrame(frame: Frame): frame is UnknownFrame {
  return frame.type === FrameContentType.Unknown;
}

export function isTextFrame(frame: Frame): frame is TextFrame {
  return frame.type === FrameContentType.Text;
}

export function isAttachedPictureFrame(
  frame: Frame,
): frame is AttachedPictureFrame {
  return frame.type === FrameContentType.AttachedPicture;
}

export function isCommentFrame(frame: Frame): frame is CommentFrame {
  return frame.type === FrameContentType.Comment;
}

export function isUnsynchronisedLyricsFrame(
  frame: Frame,
): frame is UnsynchronisedLyricsFrame {
  return frame.type === FrameContentType.UnsynchronisedLyrics;
}

export function isUserDefinedTextFrame(
  frame: Frame,
): frame is UserDefinedTextFrame {
  return frame.type === FrameContentType.UserDefinedText;
}

export function isPrivateFrame(frame: Frame): frame is PrivateFrame {
  return frame.type === FrameContentType.Private;
}

export function isURLLinkFrame(frame: Frame): frame is URLLinkFrame {
  return frame.type === FrameContentType.URLLink;
}
