
import ReactQuill from 'react-quill';

declare module 'react-quill' {
  interface Quill {
    lineTracking: {
      initializeUuids: () => boolean;
      getLineUuid: (oneBasedIndex: number) => string | undefined;
      setLineUuid: (oneBasedIndex: number, uuid: string) => void;
      getUuidMap: () => Array<[number, string]>;
    };
    getContent: (index: number, length: number) => string;
  }
}
