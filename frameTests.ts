import { FrameContentType } from "./types.ts";
import type {
  AttachedPictureFrame,
  CommentFrame,
  Frame,
  TextFrame,
  UnknownFrame,
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
