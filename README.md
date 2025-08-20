Rewrite Scripts

Overview
A web app for collaboratively editing scripts. Content is stored in Supabase and edited in a Quill-based rich text editor and is also saved to the users github account.
- Tech: React + Vite + TypeScript, React Quill, Supabase (auth, database), shadcn/ui for components.

Development
- Prerequisites: Node 18+, pnpm/npm
- Install and run
  - Install: `npm install`
  - Dev server: `npm run dev`
  - Lint: `npm run lint`
  - Build: `npm run build`
  - Preview: `npm run preview`

Key Features
- A user connects to the app by visiting https://colaborative-writing.netlify.app/auth
- When the user connects with their GitHub account, they can create a script.
- Non-admins can submit edits as suggestions; admins see inline highlights and can approve or reject the edits.
- Inline review UI: Clickable highlights with a fixed popover for Approve/Reject.
- Versioning and GitHub: Admins can save versions and optionally commit the script to GitHub.
- Drafts: Non-admins can save personal drafts before submitting as suggestions (this is currently not working)
- Profiles and scripts: Basic profile management and a scripts list with create/rename functionality.

Project Structure Overview
- `components/` UI and editor pieces (DeltaTextEditor, toolbar, dialogs, suggestions UI, profile and scripts views).
- `hooks/` data fetching and editor/suggestion logic (loader, manager, formatting, submit handlers, script data).
- `services/` API calls to Supabase and related composition logic.
- `pages/` top-level views (Index, Auth, Profile, ScriptEdit).
- `utils/` delta conversions, editor types, and save helpers.

How It Fits Together
- Routing: `App.tsx` registers routes for Auth, Profile, Index, ScriptEdit, etc.
- Script editor page: `pages/ScriptEdit.tsx` loads script data and pending suggestion counts, then renders `components/script/ScriptEditor.tsx`.
- Editor shell: `ScriptEditor` wraps `DeltaTextEditor` and the Save Version dialog.
- Rich text editor: `components/DeltaTextEditor.tsx` wires the Quill editor, toolbar, dialogs, suggestion overlay/controls, and submit handlers.
- Supabase integration: All persistence (scripts, suggestions, drafts, versions, profiles) is via `integrations/supabase/client.ts`.

Core Flows
- Loading content
  - `hooks/useTextEditor.tsx` fetches the current script content (or a user draft for non-admins), normalizes it to a Quill Delta, and provides a `quillRef` to control the editor.
- Making edits
  - Non-admins: Use the editor to change content, then “Suggest Changes”. The app diffs original vs. edited and stores only the Quill delta diff (retain/insert/delete/attributes).
  - Admins: Edit directly when there are no pending suggestions; otherwise review suggestions first.
- Suggestion lifecycle
  - Load: `hooks/suggestion/useSuggestionLoader.ts` fetches pending suggestions and joins usernames.
  - Render: `hooks/suggestion/useSuggestionManager.ts` overlays suggestion highlights into Quill and handles click/hover interactions.
  - Review: `components/suggestions/SuggestionPopover.tsx` shows details and Approve/Reject actions; `InlineSuggestionControls` offers quick actions.
  - Persist: `services/suggestionService.ts` composes diffs onto the `scripts` content for approve, marks status, and updates other pending diffs where needed.
- Versioning and GitHub
  - `components/editor/SaveVersionDialog.tsx` plus `hooks/script/useGithubIntegration.ts` coordinate saving a named version and optional commit.

Data Model (Supabase)
- scripts: Current canonical content for each script (stored as a Quill Delta JSON) plus metadata.
- script_suggestions: Pending/approved/rejected suggestions as Quill delta diffs; includes author and timestamps.
- script_drafts: Per-user draft content for non-admin editing sessions.
- script_versions: Snapshot history of script content.
- profiles: User profile and username lookup for display.

Important Modules
- Editor composition
  - `components/DeltaTextEditor.tsx`: orchestrates editor content, toolbar (`EditorToolbar`), dialogs (`EditorDialogs`), and suggestion review.
  - `components/editor/EditorContent.tsx`: the React Quill instance and supported formats (including suggestion marks).
  - `hooks/editor/useEditorFormat.ts`: formatting state and handlers for bold/italic/align/direction.
  - `hooks/editor/useEditorSubmitHandlers.ts`: routes actions to save edits, submit suggestions, and save versions.
- Suggestions
  - `hooks/suggestion/useSuggestionLoader.ts`: fetches pending suggestions and usernames.
  - `hooks/suggestion/useSuggestionManager.ts`: overlays suggestions, handles clicks/hover, opens popovers, and calls approve/reject.
  - `components/suggestions/SuggestionPopover.tsx`: fixed-position Approve/Reject popover.
  - `components/suggestions/InlineSuggestionControls.tsx`: small inline hover controls (✓/✕).
  - `services/suggestionService.ts`: server interactions for approve/reject and content composition.
- Listing and navigation
  - `pages/Index.tsx` lists scripts; `pages/Profile.tsx` manages profile; `pages/Auth.tsx` handles auth; `pages/ScriptEdit.tsx` is the main editor page.

How Suggestions Are Stored
- Each suggestion is a Quill Delta diff, not a full copy. Typical operations:
  - retain: move the index forward without changing content (optionally includes attribute changes).
  - insert: proposed new text.
  - delete: proposed removal length.
- Block-level attributes (align/direction) are highlighted across full lines so admins can review and act on them.

Admin vs Contributor UX
- Contributor
  - Create or open a script, edit in the Quill editor, and click “Suggest Changes”.
  - Optionally save a draft without submitting.
- Admin
  - If pending suggestions exist, the editor shows highlights with Approve/Reject controls.
  - Approving composes the diff into `scripts.content` and records a version. Rejecting marks it rejected.
  - With no pending suggestions, the admin can edit and save changes directly or save a named version; GitHub commit is available if configured.





