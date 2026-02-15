# Specification

## Summary
**Goal:** Add a plain-text notes field to surgery cases so users can write, save, and edit case notes.

**Planned changes:**
- Extend the backend `SurgeryCase` model with a free-text `notes` field and include it in all APIs that return cases (e.g., getCase/listCases/exportCases).
- Update backend `createCase`/`updateCase` APIs to accept and persist the `notes` field.
- Add an upgrade-safe backend migration so existing stored cases load after the schema change, defaulting missing `notes` to an empty string.
- Update the frontend case create/edit workflow to include a multi-line “Case Notes” textarea, prefilled on edit, and saved to the backend.
- Update frontend types and data flow end-to-end (queries/mutations and import/export) to include `notes`, with CSV/JSON handling defaulting to empty string when missing.

**User-visible outcome:** Users can enter multi-line case notes when creating or editing a surgery case, and those notes are saved, shown when reopening the case, and included in imports/exports.
