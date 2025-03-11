
import React from 'react';
import { TextEditorContainer } from './editor/TextEditorContainer';
import { DeltaContent } from '@/utils/editor/types';
import 'react-quill/dist/quill.snow.css';
import { SuggestionFormatModule } from './editor/SuggestionFormatModule';
import { LineTrackingModule } from './editor/LineTrackingModule';

// Register modules just once
try {
  SuggestionFormatModule.register(ReactQuill.Quill);
  LineTrackingModule.register(ReactQuill.Quill);
  console.log('📝 All Quill modules registered successfully');
} catch (error) {
  console.error('📝 Error registering Quill modules:', error);
}

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string | DeltaContent) => void;
}

export const TextEditor: React.FC<TextEditorProps> = (props) => {
  return <TextEditorContainer {...props} />;
};
