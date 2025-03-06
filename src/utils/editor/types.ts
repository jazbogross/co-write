
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
  // Additional methods required by Quill's DeltaStatic interface
  insert?: (text: string, attributes?: Record<string, any>) => QuillCompatibleDelta;
  retain?: (length: number, attributes?: Record<string, any>) => QuillCompatibleDelta;
  delete?: (length: number) => QuillCompatibleDelta;
  filter?: (predicate: (op: DeltaOp) => boolean) => DeltaOp[];
  forEach?: (predicate: (op: DeltaOp) => void) => void;
  map?: <T>(predicate: (op: DeltaOp) => T) => T[];
  partition?: (predicate: (op: DeltaOp) => boolean) => [DeltaOp[], DeltaOp[]];
  reduce?: <T>(predicate: (acc: T, op: DeltaOp) => T, initial: T) => T;
  chop?: () => QuillCompatibleDelta;
  slice?: (start?: number, end?: number) => QuillCompatibleDelta;
  compose?: (other: QuillCompatibleDelta) => QuillCompatibleDelta;
  transform?: (other: QuillCompatibleDelta, priority?: boolean) => QuillCompatibleDelta;
  transformPosition?: (index: number, priority?: boolean) => number;
  changeLength?: () => number;
  length?: () => number;
}
