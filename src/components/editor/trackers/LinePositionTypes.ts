
/**
 * LinePositionTypes.ts - Types for line position tracking
 */

// Basic mapping interfaces
export interface LineUuidMap {
  get(index: number): string | undefined;
  set(index: number, uuid: string): void;
  has(index: number): boolean;
  size: number;
}

export interface ContentUuidMap {
  get(content: string): string | undefined;
  set(content: string, uuid: string): void;
  has(content: string): boolean;
  size: number;
}

// Line operation types
export type LineOperationType = 'insert' | 'delete' | 'move' | 'edit';

export interface LineOperation {
  type: LineOperationType;
  index: number;
  content?: string;
  uuid?: string;
}
