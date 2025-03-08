
/**
 * EditorReadinessChecker.ts - Handles determining if the editor is ready for UUID operations
 */

import { EditorReadyState } from './UuidManagerTypes';

export class EditorReadinessChecker {
  private readyState: EditorReadyState = 'not-ready';
  private quill: any = null;

  constructor() {
    this.readyState = 'not-ready';
  }

  /**
   * Set the Quill editor instance and initialize readiness listeners
   */
  setQuill(quill: any): void {
    this.quill = quill;
    
    // Add editor-change event listener to check when editor is truly ready
    if (quill) {
      quill.on('editor-change', (eventName: string) => {
        if (eventName === 'text-change' && this.readyState === 'not-ready') {
          this.readyState = 'initializing';
        }
      });
    }
  }

  /**
   * Check if editor DOM is fully ready for UUID assignment
   */
  isEditorReady(): boolean {
    if (!this.quill) return false;
    
    try {
      const lines = this.quill.getLines(0);
      const editor = this.quill.root;
      
      if (!editor) return false;
      
      // Check if DOM elements exist for each line
      const paragraphs = editor.querySelectorAll('p');
      
      // Check if the line count matches the DOM paragraph count
      if (lines.length !== paragraphs.length) {
        return false;
      }
      
      // Check if each line has a corresponding DOM node
      const allLinesHaveDomNodes = lines.every((line: any) => line.domNode !== undefined);
      
      if (!allLinesHaveDomNodes) {
        return false;
      }
      
      // Editor appears ready
      if (this.readyState !== 'ready') {
        console.log('Editor is fully ready for UUID assignments');
        this.readyState = 'ready';
      }
      
      return true;
    } catch (error) {
      console.error('Error checking editor readiness:', error);
      return false;
    }
  }

  /**
   * Get the current ready state
   */
  getReadyState(): EditorReadyState {
    return this.readyState;
  }
}
