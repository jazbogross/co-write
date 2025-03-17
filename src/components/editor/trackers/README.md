
# Line Tracking System Documentation

## Overview

The Line Tracking System provides powerful line-level tracking capabilities for the Quill-based rich text editor. It assigns unique identifiers (UUIDs) to each line and maintains them during editing operations, allowing for:

- Collaborative editing with line-level granularity
- Tracking authorship of individual lines
- Supporting line-level suggestions and comments
- Preserving line identity during complex editing operations

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
LineTrackingModule (entry point)
    │
    ├── LineTracker (facade)
    │      │
    │      └── LineTrackerManager (coordinator)
    │             │
    │             ├── LineTrackerCoordinator (delegator)
    │             │      │
    │             │      ├── EventCoordinator
    │             │      ├── LineTrackerInitializationService
    │             │      └── UuidOperationsCoordinator
    │             │
    │             ├── CursorPositionManager
    │             └── LineHistoryManager
    │
    ├── LinePosition (DOM interaction)
    │      │
    │      ├── LineUuidManager
    │      ├── LineContentTracker
    │      ├── LineCountTracker
    │      ├── LineUuidRefresher
    │      ├── LinePositionInitializer
    │      └── LineAttributeUpdater
    │
    └── Event Handlers
           │
           ├── TextChangeHandler
           ├── ProgrammaticUpdateHandler
           ├── UuidRefreshHandler
           ├── SelectionChangeHandler
           ├── LineSplitHandler
           ├── DeleteMergeHandler
           ├── EnterAtZeroHandler
           └── NewLineHandler
```

## Core Components

### Entry Point and Registration

- **LineTrackingModule**: Registers the system with Quill. It ensures the module is only registered once and handles the module configuration.

### Main Components

- **LineTracker**: The facade class that provides the public API for the module.
- **LineTrackerManager**: Manages the overall state and coordinates between components.
- **LineTrackerCoordinator**: Delegates responsibilities to specialized coordinators and initializes the system.

### Coordinator Components

- **EventCoordinator**: Sets up event listeners for Quill events and delegates them to appropriate handlers.
- **LineTrackerInitializationService**: Handles the initialization sequence and ensures all lines have UUIDs.
- **UuidOperationsCoordinator**: Manages UUID-related operations (getting, setting, refreshing).

### Line Position Management

- **LinePosition**: Central class for tracking line positions and UUID assignments in the DOM.
- **LineUuidManager**: Manages the mapping between line indices and UUIDs.
- **LineContentTracker**: Tracks line content for matching lines across edits.
- **LineCountTracker**: Monitors changes in line count to detect insertions and deletions.
- **LineUuidRefresher**: Handles refreshing UUIDs from external data sources.
- **LinePositionInitializer**: Initializes line position tracking at startup.
- **LineAttributeUpdater**: Updates line index attributes in the DOM.

### Event Handling

- **LineTrackerEventHandler**: The main event handler that coordinates specific operations.
- **TextChangeHandler**: Processes text change events and determines structural changes.
- **ProgrammaticUpdateHandler**: Manages entering and exiting programmatic update mode.
- **UuidRefreshHandler**: Refreshes line UUIDs from external data.
- **SelectionChangeHandler**: Handles cursor position changes.

### Operation Handlers

- **StructuralChangeAnalyzer**: Analyzes structural changes in delta operations.
- **HandlerDispatcher**: Dispatches operations to appropriate handlers.
- **EventPreProcessor**: Pre-processes and post-processes events.
- **LineSplitHandler**: Handles line split operations.
- **NewLineHandler**: Handles creation of new lines.
- **EnterAtZeroHandler**: Handles the special case of pressing Enter at position 0.
- **DeleteMergeHandler**: Handles line deletion and merging.

## Key Concepts

### Unique Line Identifiers (UUIDs)

Each line in the editor has a unique identifier stored as a `data-line-uuid` attribute in the DOM. This UUID persists even when the line's position changes, content is edited, or surrounding lines are added or removed.

### Line Position Tracking

The system tracks line positions both by index (1-based) and by UUID. This dual approach allows for robust tracking even during complex editing operations.

### Content-Based Line Matching

When lines move or change significantly, the system can use content-based matching to maintain UUID continuity. This is particularly useful for collaborative editing scenarios.

### Programmatic Update Mode

When making programmatic changes to the content, the system enters a special mode that preserves UUIDs and cursor positions. This ensures that user experience remains smooth even during complex operations.

## Main Workflows

### Initialization

1. The `LineTrackingModule` registers with Quill.
2. When an editor instance is created, a new `LineTracker` instance is attached.
3. `LineTrackerManager` initializes the core components.
4. `LineTrackerCoordinator` sets up event listeners and initializes line tracking.
5. `LinePositionInitializer` assigns initial UUIDs to all lines.

### Handling Text Changes

1. Quill fires a `text-change` event.
2. `EventCoordinator` delegates to `LineTrackerEventHandler`.
3. `TextChangeHandler` analyzes the change to determine if it's structural.
4. If structural, appropriate handlers like `LineSplitHandler` or `NewLineHandler` are invoked.
5. UUIDs are preserved, restored, or generated as needed.
6. Line indices are updated to reflect the new document state.
7. The cursor position is restored.

### UUID Management

1. UUIDs are stored in the DOM as `data-line-uuid` attributes.
2. The `LineUuidManager` maintains a mapping between line indices and UUIDs.
3. The `LineContentTracker` tracks content for content-based matching.
4. During editing operations, the `UuidPreservationService` preserves UUIDs before DOM changes.
5. After editing, UUIDs are restored or new ones are generated for new lines.

## Line Matching Strategies

When content changes, the system uses several strategies to maintain line identity:

1. **DOM UUID Matching**: If a line's DOM node has a UUID, use it.
2. **Content Exact Matching**: Match lines with identical content.
3. **Content Similarity Matching**: Match lines with similar content.
4. **Empty Line Matching**: Special handling for empty lines.
5. **Position-Based Fallback**: Use position as a last resort for matching.

## Future Improvements

- Enhanced performance for very large documents
- Better handling of complex formatting operations
- Improved algorithms for content-based line matching
- Support for collaborative conflict resolution
