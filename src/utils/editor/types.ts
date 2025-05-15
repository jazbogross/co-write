
import type { Sources } from 'quill';
import { DeltaStatic, DeltaOperation, DeltaContent } from './quill-types';

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

export { DeltaStatic, DeltaContent, DeltaOperation };
