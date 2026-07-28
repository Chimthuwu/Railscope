# Security Spec

## 1. Data Invariants
- A post must have a text content and valid authorId.
- `createdAt` must be the server time.
- `likesCount` must start at 0, and can only be updated by +/- 1 when a like is added or removed.
- Likes subcollection documents must have ID matching the userId, and `userId` field matching the auth UID.

## 2. Dirty Dozen Payloads
(Skipped for now, rules will be hardened directly)
