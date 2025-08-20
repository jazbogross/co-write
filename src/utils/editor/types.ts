
import type { DeltaStatic, Sources } from 'quill';

export interface DeltaOp {
  insert?: string | object;
  delete?: number;
  retain?: number;
  attributes?: Record<string, any>;
}

export interface DeltaContent {
  ops: DeltaOp[];
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

export { DeltaStatic };
