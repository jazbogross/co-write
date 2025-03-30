
/**
 * Formats for Quill editor related to displaying suggestions
 */

/**
 * Register suggestion format with Quill
 */
export const registerSuggestionFormats = (Quill: any): boolean => {
  try {
    // This is a simplified version that will be expanded later
    // when we implement the new suggestion system
    return true;
  } catch (error) {
    console.error('Error registering suggestion formats:', error);
    return false;
  }
};

/**
 * CSS for styling suggestion formats in Quill
 */
export const suggestionFormatCSS = `
.ql-suggestion-add {
  background-color: rgba(0, 255, 0, 0.2);
}
.ql-suggestion-remove {
  background-color: rgba(255, 0, 0, 0.2);
  text-decoration: line-through;
}
`;
