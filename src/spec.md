# Specification

## Summary
**Goal:** Improve the DebugPanel to correctly surface cached backend actor initialization errors and clearly trace case-count results from different backend calls.

**Planned changes:**
- Update DebugPanel to read the cached actor query state using the same React Query key structure as `useActor`, without relying on a `"Not logged in"` key segment when logged out.
- Ensure DebugPanel displays any cached actor initialization error (when present) for both logged-in and logged-out states, using the correct query key.
- Add a new (non-immutable) React Query query/hook to call `actor.getCaseCount()` and return a numeric count.
- Update DebugPanel UI to show two labeled counts: one derived from `actor.listCases()` and one from `actor.getCaseCount()`, with clear English source labels.
- Update DebugPanel refresh behavior to refetch the relevant case-count queries, showing an English success/error toast, and displaying per-count error indicators without breaking the other count.

**User-visible outcome:** The DebugPanel shows actor initialization errors more reliably and displays two clearly labeled case counts (“listCases” vs “getCaseCount”), with refresh and error feedback for each source independently.
