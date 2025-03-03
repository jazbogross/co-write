
import { Delta, ContentType } from './editor';

export interface LineData {
  uuid: string;
  lineNumber: number;
  content: ContentType;
  originalAuthor: string | null;
  editedBy: string[];
  hasDraft?: boolean;
  originalContent?: ContentType;
  originalLineNumber?: number;
}
