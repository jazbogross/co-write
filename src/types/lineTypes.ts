
import type { DeltaStatic } from 'quill';

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
  createdAt: string;
  updatedAt: string;
}

// Script draft type
export interface ScriptDraft {
  id?: string;
  scriptId: string;
  userId: string;
  draftContent: DeltaStatic;
  updatedAt?: string;
}

// Script version history
export interface ScriptVersion {
  id: string;
  scriptId: string;
  versionNumber: number;
  contentDelta: DeltaStatic;
  createdBy?: string;
  createdAt: string;
}

// For backwards compatibility - will be used less in the new approach
export interface LineData {
  uuid: string;
  lineNumber: number;
  content: any;
  originalAuthor?: string | null;
  editedBy?: string[] | null;
  hasDraft?: boolean;
  originalContent?: any;
  originalLineNumber?: number;
}

// Delta content type for simplification
export interface DeltaContent {
  ops: Array<{
    insert?: string | object;
    delete?: number;
    retain?: number;
    attributes?: Record<string, any>;
  }>;
}

// Re-export DeltaStatic for use in other files
export type { DeltaStatic };
