
export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string | { ops: Array<{ insert: string, attributes?: any }> };
  originalAuthor: string | null;
  editedBy: string[];
  hasDraft?: boolean;
  originalContent?: string | { ops: Array<{ insert: string, attributes?: any }> };
  originalLineNumber?: number;
}
