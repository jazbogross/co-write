
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

// Add Quill LineTracking type definitions for backwards compatibility
declare module 'quill' {
  interface Quill {
    getModule(name: string): any;
  }
}
