
import React from 'react';
import ReactQuill from 'react-quill';
import { useScriptEditor } from '@/hooks/useScriptEditor';
import { DeltaStatic } from 'quill';
import { Button } from '@/components/ui/button';
import 'react-quill/dist/quill.snow.css';

interface DeltaTextEditorProps {
  isAdmin: boolean;
  scriptId: string;
  onSuggestChange?: (delta: DeltaStatic) => void;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({
  isAdmin,
  scriptId,
  onSuggestChange
}) => {
  const {
    content,
    isLoading,
    isSaving,
    hasDraft,
    quillRef,
    saveContent,
    handleChange,
    submitChanges,
    modules,
    formats
  } = useScriptEditor({
    scriptId,
    isAdmin,
    onSuggestChange
  });

  if (isLoading) {
    return <div className="p-4 text-center">Loading editor...</div>;
  }

  return (
    <div>
      {/* Editor Actions */}
      <div className="flex justify-between mb-4">
        <div>
          {hasDraft && !isAdmin && (
            <span className="text-sm text-amber-600 font-medium">
              You have unsaved changes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveContent}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isAdmin ? 'Save Changes' : 'Save Draft'}
          </Button>
          
          {!isAdmin && (
            <Button
              variant="default"
              size="sm"
              onClick={submitChanges}
              disabled={isSaving}
            >
              Submit Changes
            </Button>
          )}
        </div>
      </div>

      {/* Quill Editor */}
      <div className="bg-white border rounded-md">
        <ReactQuill
          ref={quillRef}
          value={content || undefined}
          onChange={(content, delta, source, editor) => {
            // Extract the Delta content from the editor directly
            const deltaContent = editor.getContents();
            handleChange(deltaContent);
          }}
          modules={modules}
          formats={formats}
          theme="snow"
        />
      </div>
    </div>
  );
};
