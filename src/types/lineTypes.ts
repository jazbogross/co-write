
import { DeltaContent } from '@/utils/editor/types';

export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string | DeltaContent;
  originalAuthor: string | null;
  editedBy: string[];
  hasDraft?: boolean;
  originalContent?: string | DeltaContent;
  originalLineNumber?: number;
}

// Add Quill LineTracking type definitions
declare module 'quill' {
  interface Quill {
    lineTracking?: {
      initialize: () => void;
      setProgrammaticUpdate: (value: boolean) => void;
      getLineUuid: (oneBasedIndex: number) => string | undefined;
      setLineUuid: (oneBasedIndex: number, uuid: string) => void;
      getContentToUuidMap: () => Map<string, string>;
      getDomUuidMap: () => Map<number, string>;
      getLastOperation: () => { type: string, lineIndex: number, movedContent?: string } | null;
      getChangeHistory: (uuid: string) => { content: string, timestamp: number }[];
      refreshLineUuids: (lineData: any[]) => void; 
      forceRefreshUuids: () => void;
      saveCursorPosition: () => void;
      restoreCursorPosition: () => void;
    };
  }
}
