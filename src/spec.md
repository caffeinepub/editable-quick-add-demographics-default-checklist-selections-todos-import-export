# Specification

## Summary
**Goal:** Trigger a fresh deployment retry to restart the stopped backend canister without changing application functionality.

**Planned changes:**
- Update `frontend/public/deploy-retry.txt` contents (e.g., change the ISO timestamp on line 1) to force a deployment retry.

**User-visible outcome:** After redeploy, the backend canister is running again and the frontend DebugPanel no longer reports “Backend Actor: Not Ready” due to IC0508 “canister is stopped”.
