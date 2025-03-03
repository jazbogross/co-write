
/**
 * Core types for Delta content handling
 */

export type DeltaContent = {
  ops: DeltaOp[];
};

export type DeltaOp = {
  insert: string;
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
