# WithBroker Security Specification (Properties + Roommate Connect)

## Data Invariants
1. **Sole Admin Isolation**: Only verified Google account `yogeshbkumbhar0.2@gmail.com` (`email_verified == true`) can approve, reject, publish to `/public_properties` or `/public_roommates`, read private `/property_submissions`, read `/roommate_reports`, or manage photos globally.
2. **Roommate Ownership Enforcement**: Every document in `/roommate_listings` is bound to an immutable `userId == request.auth.uid` (verified user). Non-owners receive `PERMISSION_DENIED` on `get`, `list`, `update`, and `delete`.
3. **Zero Self-Approval**: Non-admin users creating a `/roommate_listings` record MUST set `status == 'Pending'`, `reportCount == 0`, `approvedAt == null`, `expiresAt > request.time`, and CANNOT create `/public_roommates` records or elevate `status` from `Pending`/`Rejected` to `Active`.
4. **PII Split-Collection Isolation**: Private personal phone numbers (`contactNumber`, `whatsappNumber`) and exact building names remain isolated in `/roommate_listings`. `/public_roommates` only exposes `publicBuildingName` or `publicWhatsappNumber` when the owner explicitly opts in (`showExactAddress` / `showPublicContact`).
5. **Action-Based Updates & Immutability**: `listingCode`, `userId`, and `createdAt` are immutable across all updates; every update path passes `isValidRoommateListing()` / `isValidPublicRoommate()` and strict `affectedKeys().hasOnly(...)` allowlists.

## Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Approval on Create**: User submits `/roommate_listings/WB-RM-9001` with `status: "Active"` -> DENIED.
2. **Direct Public Publish Bypass**: Non-admin tries `create` on `/public_roommates/WB-RM-9001` -> DENIED.
3. **Identity Spoofing**: User A creates `/roommate_listings/WB-RM-9002` with `userId: "user-B-uid"` -> DENIED.
4. **Cross-Owner Read (PII Scrape)**: User B attempts `get` or `list` on User A's `/roommate_listings` doc -> DENIED.
5. **Cross-Owner Edit**: User B attempts `update` on User A's `/roommate_listings` or `/public_roommates` -> DENIED.
6. **Cross-Owner Delete**: User B attempts `delete` on User A's `/roommate_listings` -> DENIED.
7. **Shadow Ghost Field Injection**: User A includes extra field `isVerified: true` on `/roommate_listings` create/update -> DENIED via `keys().hasOnly(...)`.
8. **Unverified Admin Email Spoof**: Token with `email: "yogeshbkumbhar0.2@gmail.com"` and `email_verified: false` -> DENIED.
9. **Pending-to-Active Self Escalation**: User A updates their `Pending` listing changing `status` to `"Active"` -> DENIED.
10. **Timestamp Spoofing**: Client sends backdated `createdAt` or `updatedAt != request.time` -> DENIED.
11. **Report Tampering**: Non-admin tries to `list` or `update` `/roommate_reports` -> DENIED.
12. **Resource Exhaustion / Value Poisoning**: Payload with 50KB description or invalid `listingCode` -> DENIED via strict `.size()` and regex guards.
