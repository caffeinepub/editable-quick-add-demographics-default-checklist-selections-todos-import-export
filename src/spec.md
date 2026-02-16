# Specification

## Summary
**Goal:** Force a fresh deployment build by making a non-functional change that triggers a redeploy.

**Planned changes:**
- Update the first-line timestamp/string in `frontend/public/deploy-retry.txt` so the file content changes.

**User-visible outcome:** No user-visible changes; application behavior and UI remain unchanged while a deployment retry is triggered.
