
import Delta from 'quill-delta';

// Re-export the Delta type for use throughout the application
export type DeltaStatic = Delta;

// Re-export the Sources type that's often used with Delta
export type Sources = 'api' | 'user' | 'silent';

// Export a common interface for Delta operations
export interface DeltaOperation {
  insert?: string | Record<string, any>;
  delete?: number;
  retain?: number | Record<string, unknown>;
  attributes?: Record<string, any>;
}

// Export a cleaner Delta content interface
export interface DeltaContent {
  ops: DeltaOperation[];
}

// Use the react-quill's Value type definition instead of creating our own
export type Value = string | { ops: Array<DeltaOperation> };
