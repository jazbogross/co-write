
/**
 * Formats for Quill editor related to displaying suggestions
 */

/**
 * CSS for styling suggestion formats in Quill
 * Added GoogleDocs-like styles for suggestions
 */
export const suggestionFormatCSS = `
.ql-suggestion-add {
  background-color: rgba(0, 100, 0, 0.15);
  color: darkgreen;
  cursor: pointer;
  position: relative;
}

.ql-suggestion-add:hover {
  background-color: rgba(0, 100, 0, 0.25);
}

.ql-suggestion-remove {
  color: darkred;
  text-decoration: line-through;
  background-color: rgba(255, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
}

.ql-suggestion-remove:hover {
  background-color: rgba(255, 0, 0, 0.2);
}
`;
