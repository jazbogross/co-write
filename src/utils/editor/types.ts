
import type { Sources } from 'quill';
import type { DeltaStatic, DeltaOperation, DeltaContent } from './quill-types';

export interface DeltaOp {
  insert?: string | object;
  delete?: number;
  retain?: number;
  attributes?: Record<string, any>;
}

export interface DeltaValidationResult {
  valid: boolean;
  originalType: string;
  parsed?: DeltaContent;
  reason?: string;
}

export interface EditorChangeData {
  delta: DeltaStatic;
  oldContents: DeltaStatic;
  source: Sources;
}

export type { DeltaStatic, DeltaContent, DeltaOperation };
