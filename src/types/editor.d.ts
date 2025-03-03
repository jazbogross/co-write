
import { Quill as OriginalQuill } from 'react-quill';

// Extend the Quill type to include our custom lineTracking property
declare module 'react-quill' {
  interface Quill extends OriginalQuill {
    lineTracking?: {
      setProgrammaticUpdate: (value: boolean) => void;
      getLineUuid: (oneBasedIndex: number) => string | undefined;
      setLineUuid: (oneBasedIndex: number, uuid: string) => void;
      getContentToUuidMap: () => Map<string, string>;
      getDomUuidMap: () => Map<number, string>;
      getLastOperation: () => { type: string, lineIndex: number, movedContent?: string } | null;
      getChangeHistory: (uuid: string) => {content: string, timestamp: number}[];
    };
  }
}

// Delta type definition
export interface Delta {
  ops: Array<{
    insert: string;
    attributes?: any;
  }>;
}

// Utility type for content that can be either string or Delta
export type ContentType = string | Delta;
