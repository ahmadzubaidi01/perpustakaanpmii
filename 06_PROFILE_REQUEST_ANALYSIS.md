# Phase 6 - Profile Request Investigation

## Why Profile Requests Repeat
- **Frontend Observation**: In `ProfileScreen.tsx` or `Dashboard.tsx`, there may be an effect depending on `user` object. If `user` is updated from the API response but structurally different (new reference), it triggers a re-fetch.
- **Authentication Refresh Loop**: If the `getProfile()` call returns 401, the Axios interceptor attempts to refresh the token. If the refresh fails or succeeds but the subsequent `getProfile()` still fails, it creates an infinite retry loop.

## Hierarchical Dropdowns (Region -> District -> School)
- **Observation**: Changing a region triggers a fetch for districts. If the selected district is reset to null programmatically, it might re-trigger the region change effect.
- **Conclusion**: Circular dependency in React `useEffect` hooks managing cascading dropdown state.
