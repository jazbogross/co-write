
/**
 * Core types for Delta content handling
 */

export type DeltaContent = {
  ops: DeltaOp[];
};

export type DeltaOp = {
  insert: string | object;
  attributes?: Record<string, any>;
};

/**
 * Union type for all possible content formats
 */
export type ContentType = DeltaContent | string | null;

/**
 * Type guard result with diagnostic information
 */
export type DeltaValidationResult = {
  valid: boolean;
  parsed?: DeltaContent;
  originalType: string;
  reason?: string;
};

/**
 * Interface to make DeltaContent compatible with Quill's Delta type
 * Adding the minimum properties needed for compatibility
 */
export interface QuillCompatibleDelta extends DeltaContent {
  retain?: (index: number, length?: number) => QuillCompatibleDelta;
  delete?: (index: number) => QuillCompatibleDelta;
  filter?: (predicate: (op: DeltaOp) => boolean) => DeltaOp[];
  forEach?: (predicate: (op: DeltaOp) => void) => void;
  map?: <T>(predicate: (op: DeltaOp) => T) => T[];
  partition?: (predicate: (op: DeltaOp) => boolean) => [DeltaOp[], DeltaOp[]];
  reduce?: <T>(predicate: (acc: T, op: DeltaOp) => T, initial: T) => T;
  changeLength?: () => number;
  length?: () => number;
}
