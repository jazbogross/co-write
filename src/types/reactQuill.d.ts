
declare module 'react-quill' {
  import { Quill as OriginalQuill } from 'quill';
  
  // Extend Quill to include our custom lineTracking property
  export interface Quill extends OriginalQuill {
    lineTracking?: {
      setProgrammaticUpdate(value: boolean): void;
      getLineUuid(oneBasedIndex: number): string | undefined;
      setLineUuid(oneBasedIndex: number, uuid: string): void;
      getContentToUuidMap(): Map<string, string>;
      getDomUuidMap(): Map<number, string>;
      getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null;
      getChangeHistory(uuid: string): {content: string, timestamp: number}[];
    };
  }
  
  // Re-export the rest of ReactQuill
  const ReactQuill: React.ForwardRefExoticComponent<
    ReactQuill.ReactQuillProps & React.RefAttributes<ReactQuill>
  >;
  
  namespace ReactQuill {
    interface ReactQuillProps {
      modules?: Record<string, any>;
      formats?: string[];
      theme?: string | null;
      value?: string | Delta;
      defaultValue?: string | Delta;
      placeholder?: string;
      readOnly?: boolean;
      onChange?: (content: string, delta: any, source: any, editor: any) => void;
      onChangeSelection?: (range: any, source: any, editor: any) => void;
      onFocus?: (range: any, source: any, editor: any) => void;
      onBlur?: (previousRange: any, source: any, editor: any) => void;
      onKeyPress?: React.KeyboardEventHandler<HTMLDivElement>;
      onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
      onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
      preserveWhitespace?: boolean;
      className?: string;
      style?: React.CSSProperties;
    }
    
    interface UnprivilegedEditor {
      getLength(): number;
      getText(index?: number, length?: number): string;
      getHTML(): string;
      getBounds(index: number, length?: number): any;
      getSelection(focus?: boolean): { index: number; length: number } | null;
      getContents(index?: number, length?: number): Delta;
    }
    
    type Delta = {
      ops?: Array<{
        insert?: any;
        delete?: number;
        retain?: number;
        attributes?: {
          [key: string]: any;
        };
      }>;
    };
  }
  
  export default ReactQuill;
}
