# Specification

## Summary
**Goal:** Improve surgery case entry and management by making Quick Add demographics editable before applying, turning selected checklist items into persistent to-dos, adding import/export, and enabling sortable case lists.

**Planned changes:**
- Update Quick Add Demographics preview to render editable inputs for parsed fields (e.g., MRN, patient name, DOB, species, breed, sex, arrival date) and apply the edited values into the CaseForm on “Apply to Form” without auto-saving.
- On New Case only, set “Discharge Notes Complete” and “pDVM Notified” checklist items to be checked by default, without overriding saved values when editing an existing case.
- Persist a per-case “to do” list derived from which checklist items are checked at New Case submission time; show a “To Do” section on Case Detail and allow toggling completion while retaining the to-do list membership (including any needed state migration for existing cases).
- Add export (download all cases to a file, JSON acceptable) and import (upload a file to restore cases) with clear English success/failure messaging and backend APIs that safely handle IDs and future case creation.
- Add sorting controls on the case list to sort by Arrival Date (newest/oldest) and at least one additional field (e.g., MRN or patient name), with a consistent default sort and no breakage to existing search/filter behavior.

**User-visible outcome:** Users can edit parsed demographics before applying them to a new case, see sensible default checklist selections on new cases, have checked checklist items saved and managed as to-dos on the case record, import/export all cases via file, and sort the case list by arrival date and another field.
