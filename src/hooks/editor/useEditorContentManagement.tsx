
import { useCallback, useRef } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import { insertContentWithLineBreaks } from '@/utils/editor/content/insertionUtils';

/**
 * Hook to handle updating editor content programmatically
 */
export const useEditorContentManagement = (
  setContent: (content: string | DeltaContent) => void
) => {
  // Prevent recursive updates
  const isUpdatingEditorRef = useRef(false);

  /**
   * Updates editor content programmatically
   */
  const updateEditorContent = useCallback((
    newContent: string | DeltaContent, 
    forceUpdate: boolean = false
  ) => {
    console.log('📝 useEditorContentManagement: updateEditorContent called with', {
      contentType: typeof newContent,
      isDelta: isDeltaObject(newContent),
      contentPreview: typeof newContent === 'string' 
        ? newContent.substring(0, 30) + '...' 
        : JSON.stringify(newContent).substring(0, 30) + '...',
      forceUpdate
    });
    
    // Update content state directly
    setContent(newContent);
    console.log('📝 useEditorContentManagement: Content state updated');
    
  }, [setContent]);

  return {
    updateEditorContent,
    isUpdatingEditorRef
  };
};
