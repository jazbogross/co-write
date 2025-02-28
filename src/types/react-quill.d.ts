
import ReactQuill from 'react-quill';

declare module 'react-quill' {
  export interface ReactQuillProps {
    getEditor?: () => Quill;
  }
  
  interface Quill {
    lineTracking: {
      initializeUuids: () => boolean;
      getLineUuid: (oneBasedIndex: number) => string | undefined;
      setLineUuid: (oneBasedIndex: number, uuid: string) => void;
      getUuidMap: () => Array<[number, string]>;
    };
    getContent: (index: number, length: number) => string;
    getLines: (index: number) => any[];
    getIndex: (node: any) => number;
    getLength: () => number;
    getContents: (index?: number, length?: number) => any;
    on: (event: string, callback: Function) => void;
  }
}
