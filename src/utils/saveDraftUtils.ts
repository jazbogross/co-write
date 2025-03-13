
import { DeltaStatic } from 'quill';

/**
 * Captures content directly from the DOM via the Quill editor
 */
export const captureContentFromDOM = (editor: any): DeltaStatic | null => {
  if (!editor) return null;
  
  try {
    // Get the current Delta content from the editor
    return editor.getContents();
  } catch (error) {
    console.error('Error capturing content from DOM:', error);
    return null;
  }
};

/**
 * Safely extracts content from Quill editor
 */
export const extractQuillContent = (quill: any): DeltaStatic | null => {
  if (!quill) return null;
  
  try {
    return quill.getContents();
  } catch (error) {
    console.error('Error extracting Quill content:', error);
    return null;
  }
};
