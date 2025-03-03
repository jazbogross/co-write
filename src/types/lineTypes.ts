
export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string;
  originalAuthor: string | null;
  editedBy: string[];
  hasDraft?: boolean;
  originalContent?: string;
  originalLineNumber?: number;
}
