# Specification

## Summary
**Goal:** Alert users when a new case MRN already exists and auto-fill patient demographics from the most recent matching prior case.

**Planned changes:**
- On the New Case page, detect when the entered MRN matches an MRN in the fetched cases list and show an English user-visible alert (e.g., toast).
- Auto-populate the new case form fields (MRN, date of birth, patient first name, patient last name, species, breed, sex) using the most recent existing case with that MRN (by greatest arrivalDate; fallback to greatest id).
- Ensure the behavior runs only for new-case creation (no initialData) and the alert fires once per MRN entry/change rather than repeatedly on re-render.

**User-visible outcome:** When creating a new case and entering an MRN that already exists, the user is notified and the form automatically fills in the matching patient demographics from the latest prior case.
