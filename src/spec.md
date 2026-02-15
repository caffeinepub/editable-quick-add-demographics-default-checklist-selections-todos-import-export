# Specification

## Summary
**Goal:** Add an offline mode for surgery cases that caches previously loaded data locally and safely queues changes for deferred sync when connectivity returns.

**Planned changes:**
- Cache the case list and case detail/to-do data in durable browser storage (prefer IndexedDB) and restore it on app start, scoped per authenticated Internet Identity principal.
- Add an offline/connectivity indicator plus cache/sync status in the main navigation/layout, updating automatically as connectivity changes.
- When offline (or when canister calls fail due to network), queue case/to-do write operations locally, apply optimistic UI updates, and replay the queue automatically once online.
- Persist the pending-operations queue across reloads; reconcile by refreshing React Query cache after successful replay and keep failed operations pending with an English error message.
- Add basic offline data controls: “Sync now”, show count/list of pending changes, and allow clearing pending changes only after confirmation with a warning about discarding unsynced edits.

**User-visible outcome:** Users can view previously loaded case lists and case details while offline, keep working with optimistic edits, see offline/sync status in the UI, and sync or manage pending changes once back online.
