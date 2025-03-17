
# Line Tracking Event Handlers Documentation

## Overview

The event handlers in the Line Tracking System are responsible for processing various events from the Quill editor and ensuring that line UUIDs remain consistent during editing operations. These handlers work together to provide robust line-level tracking.

## Event Handler Architecture

```
LineTrackerEventHandler (coordinator)
    │
    ├── TextChangeHandler
    │      │
    │      ├── StructuralChangeAnalyzer
    │      ├── EventPreProcessor
    │      └── HandlerDispatcher
    │             │
    │             ├── LineSplitHandler
    │             ├── NewLineHandler
    │             ├── EnterAtZeroHandler
    │             └── DeleteMergeHandler
    │
    ├── ProgrammaticUpdateHandler
    ├── UuidRefreshHandler
    └── SelectionChangeHandler
```

## Main Components

### LineTrackerEventHandler

The central coordinator for event handling that delegates to specialized handlers:

- Maintains references to the editor and various tracking services
- Delegates events to specialized handlers
- Tracks the last operation type for debugging
- Caches line content for change detection

### TextChangeHandler

Processes text change events and determines how to handle them:

- Analyzes delta changes to detect structural changes (line additions, removals, etc.)
- Coordinates the pre-processing and post-processing of changes
- Dispatches to specialized handlers for specific structural changes
- Updates line attributes for non-structural changes
- Returns information about the operation for tracking purposes

### ProgrammaticUpdateHandler

Manages entering and exiting programmatic update mode:

- Preserves line UUIDs before programmatic changes
- Restores UUIDs after programmatic changes
- Preserves cursor position during programmatic updates
- Ensures all lines have UUIDs after updates

### UuidRefreshHandler

Refreshes line UUIDs from external data sources:

- Updates UUIDs in the DOM based on provided line data
- Generates new UUIDs for lines that don't have one
- Validates that all UUIDs are unique
- Updates content cache after UUID refreshing

### SelectionChangeHandler

Handles cursor position changes:

- Tracks cursor position for restoration after operations
- Skips processing during programmatic updates

## Operation-Specific Handlers

### StructuralChangeAnalyzer

Analyzes delta changes to determine the type of structural change:

- Detects line insertions, deletions, splits, and merges
- Determines which lines are affected by the change
- Provides detailed analysis for proper handling

### EventPreProcessor

Prepares for and finalizes changes to the document:

- Saves cursor position before changes
- Preserves existing UUIDs before DOM manipulations
- Restores UUIDs and cursor position after changes
- Ensures all lines have unique UUIDs

### HandlerDispatcher

Dispatches operations to appropriate specialized handlers:

- Routes operations based on their type (split, new, delete, etc.)
- Calls the appropriate handler for each operation type
- Provides a default fallback for non-structural changes

### LineSplitHandler

Handles line split operations (Enter in the middle of a line):

- Preserves the UUID of the original line
- Generates a new UUID for the newly created line
- Updates line indices for all affected lines

### NewLineHandler

Handles the creation of new lines:

- Generates UUIDs for newly added lines
- Handles detection of which lines are new vs. existing
- Updates line indices for all lines

### EnterAtZeroHandler

Handles the special case of pressing Enter at position 0:

- Handles the unique behavior of Quill when Enter is pressed at the beginning
- Generates a new UUID for the new empty line
- Updates line indices appropriately

### DeleteMergeHandler

Handles line deletion and merge operations:

- Preserves UUIDs of remaining lines during deletions
- Handles the merging of lines (e.g., when Backspace is pressed at line start)
- Updates line indices to reflect the new positions

## Workflow Examples

### Example 1: Line Split (Enter in middle of line)

1. User presses Enter in the middle of a line
2. Quill fires a `text-change` event with a delta containing a new line insertion
3. `TextChangeHandler` receives the event and analyzes the delta
4. `StructuralChangeAnalyzer` determines this is a `SPLIT` operation
5. `EventPreProcessor` saves cursor position and preserves UUIDs
6. `HandlerDispatcher` dispatches to `LineSplitHandler`
7. `LineSplitHandler` keeps the original UUID for the first part and generates a new UUID for the second part
8. Line indices are updated for all lines
9. `EventPreProcessor` ensures all lines have UUIDs and restores cursor position

### Example 2: Line Deletion (Backspace at start of content)

1. User presses Backspace at the start of content in a line
2. Quill fires a `text-change` event with a delta containing a deletion
3. `TextChangeHandler` receives the event and analyzes the delta
4. `StructuralChangeAnalyzer` determines this is a `DELETE` operation
5. `EventPreProcessor` saves cursor position and preserves UUIDs
6. `HandlerDispatcher` dispatches to `DeleteMergeHandler`
7. `DeleteMergeHandler` ensures remaining lines keep their UUIDs
8. Line indices are updated for all lines
9. `EventPreProcessor` ensures all lines have UUIDs and restores cursor position

## Best Practices for Extending

When extending the event handling system:

1. Identify which specific operation type you need to handle
2. Create a new handler class with a clear, single responsibility
3. Update the `HandlerDispatcher` to route to your new handler
4. Ensure your handler properly manages UUIDs
5. Update line indices after your operations
6. Return appropriate operation information for debugging

## Debugging

The event handlers include extensive logging to help with debugging:

- Operation types are logged with the affected line indices
- UUID changes are logged during operations
- Line count changes are tracked and logged
- Final UUIDs are validated and issues are reported

When debugging, look for logs tagged with:
- `**** TextChangeHandler ****`
- `**** LineSplitHandler ****`
- `**** DeleteMergeHandler ****`
- `**** NewLineHandler ****`
- `**** EnterAtZeroHandler ****`
