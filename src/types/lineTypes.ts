
export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string;
  originalAuthor: string | null;
  editedBy: string[];
  draft?: string | null;
  lineNumberDraft?: number | null;
}
