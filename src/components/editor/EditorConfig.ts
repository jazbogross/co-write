
// Basic Quill module configuration. We keep formatting simple and
// include only the suggestion module for collaborative edits.
export const modules = {
  toolbar: false,
  suggestionFormat: true,
  clipboard: {
    matchVisual: true
  }
};

export const formats = ['bold', 'italic', 'align'];
