
import { DeltaStatic } from 'quill';

// Main script content Delta type
export interface ScriptContent {
  scriptId: string;
  contentDelta: DeltaStatic;
  version: number;
}

// Script suggestion type
export interface ScriptSuggestion {
  id: string;
  scriptId: string;
  userId: string;
  deltaDiff: DeltaStatic;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Script draft type
export interface ScriptDraft {
  id?: string;
  scriptId: string;
  userId: string;
  draftContent: DeltaStatic;
  updatedAt?: Date;
}

// Script version history
export interface ScriptVersion {
  id: string;
  scriptId: string;
  versionNumber: number;
  contentDelta: DeltaStatic;
  createdBy?: string;
  createdAt: Date;
}

// LineData type for backward compatibility
export interface LineData {
  uuid: string;
  lineNumber: number;
  content: any;
  originalAuthor?: string | null;
  editedBy?: string[] | null;
  hasDraft?: boolean;
  originalContent?: any;
}

// Add QuillCompatibleDelta for helpers
export interface QuillCompatibleDelta {
  ops: { insert: string | object; attributes?: Record<string, any> }[];
  retain?: (length: number, attributes?: Record<string, any>) => QuillCompatibleDelta;
  delete?: (length: number) => QuillCompatibleDelta;
  insert?: (text: string, attributes?: Record<string, any>) => QuillCompatibleDelta;
  filter?: (predicate: (op: any) => boolean) => any[];
  forEach?: (predicate: (op: any) => void) => void;
  map?: <T>(predicate: (op: any) => T) => T[];
  partition?: (predicate: (op: any) => boolean) => [any[], any[]];
  reduce?: <T>(predicate: (acc: T, op: any) => T, initial: T) => T;
  chop?: () => QuillCompatibleDelta;
  slice?: (start?: number, end?: number) => QuillCompatibleDelta;
  compose?: (other: QuillCompatibleDelta) => QuillCompatibleDelta;
  transform?: (other: QuillCompatibleDelta, priority?: boolean) => QuillCompatibleDelta;
  transformPosition?: (index: number, priority?: boolean) => number;
}

// Add Quill LineTracking type definitions for backwards compatibility
declare module 'quill' {
  interface Quill {
    getModule(name: string): any;
    lineTracking?: {
      initialize?: () => void;
      refreshLineUuids?: (lineData: LineData[]) => void;
      forceRefreshUuids?: () => void;
      saveCursorPosition?: () => void;
      restoreCursorPosition?: () => void;
      setLineUuid?: (oneBasedIndex: number, uuid: string, editor?: any) => void;
    };
  }
}
