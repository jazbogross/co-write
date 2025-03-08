
/**
 * UuidManagerTypes.ts - Type definitions for UUID management
 */

export type EditorReadyState = 'not-ready' | 'initializing' | 'ready';

export interface UuidMapOperations {
  getLineUuid(oneBasedIndex: number): string | undefined;
  setLineUuid(oneBasedIndex: number, uuid: string, quill?: any): void;
  clear(): void;
  getLineUuidMap(): Map<number, string>;
}

