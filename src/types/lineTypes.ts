
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

// Add Quill LineTracking type definitions
declare module 'quill' {
  interface Quill {
    lineTracking?: {
      setProgrammaticUpdate: (value: boolean) => void;
      getLineUuid: (oneBasedIndex: number) => string | undefined;
      setLineUuid: (oneBasedIndex: number, uuid: string) => void;
      getContentToUuidMap: () => Map<string, string>;
      getDomUuidMap: () => Map<number, string>;
      getLastOperation: () => { type: string, lineIndex: number, movedContent?: string } | null;
      getChangeHistory: (uuid: string) => { content: string, timestamp: number }[];
    };
  }
}
