# WithBroker Firestore Security Specification (Phase 0)

## 1. Core Data Invariants
1. **Single Sole Admin**: Only `request.auth.token.email == 'yogeshbkumbhar0.2@gmail.com'` with `request.auth.token.email_verified == true` has admin privileges. No public signup, no client role claims, no secondary admins.
2. **PII Split-Collection Isolation**: Owner/broker personal contact details (`submitterName`, `submitterMobile`, `submitterWhatsapp`, `rejectionReason`) exist **only** in `/property_submissions/{submissionId}`, which is strictly unreadable by public users or non-admin accounts. `/public_properties/{propertyId}` never stores PII.
3. **Public Submission Forced Pending**: Anyone can create a `/property_submissions/{submissionId}` document without logging in, ONLY if `workflowStatus == 'Pending'`, `approvedAt == null`, `rejectionReason == null`, `submittedAt == request.time`, `updatedAt == request.time`, all required fields pass schema/regex/size checks, and no ghost fields exist.
4. **Public Photos Isolation**: Public photo uploads in `/property_photos/{photoId}` must have `isPublic == false` and `dataUrl.size() <= 450000`. Public users can only `get` a photo when `resource.data.isPublic == true`. Only the sole admin can flip `isPublic` to `true` upon approval or delete photos.
5. **Public Catalog Integrity**: Only the sole admin can write to `/public_properties/{propertyId}`. Public `get`/`list` queries on `/public_properties` only return documents where `resource.data.workflowStatus in ['Available', 'Rented']`.
6. **Notifications Integrity**: Public users can only create `/admin_notifications/{id}` with `type == 'submission'`, `isRead == false`, `createdAt == request.time`. Only the sole admin can read, mark read, or delete notifications.

## 2. "Dirty Dozen" Adversarial Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Approval Attack**: Public user creates `/property_submissions/WB-9001` with `workflowStatus: "Available"`.
2. **Direct Public Catalog Injection**: Public user creates `/public_properties/WB-9001` directly.
3. **Ghost / Shadow Field Injection**: Public user submits `/property_submissions/WB-9002` with extra field `isAdminApproved: true`.
4. **Email Spoofing Attack**: Authenticated user with `email: "yogeshbkumbhar0.2@gmail.com"` and `email_verified: false` tries to read `/property_submissions`.
5. **Non-Admin PII Read**: Authenticated non-admin user (`other@gmail.com`) tries `get` or `list` on `/property_submissions`.
6. **Unauthorized Status Tampering**: Public or non-admin user tries `update` on `/property_submissions/WB-1010` to set `workflowStatus: "Available"`.
7. **Unauthorized Deletion**: Non-admin user tries `delete` on `/property_submissions/WB-1001` or `/public_properties/WB-1001`.
8. **Pending Photo Leak**: Public user tries `get` on `/property_photos/photo-pending-1` where `isPublic == false`.
9. **Public Photo Auto-Publish**: Public user creates `/property_photos/photo-hack-1` with `isPublic: true`.
10. **ID Poisoning / Resource Exhaustion**: Public user creates `/property_submissions/<1500-char-junk-id>` or sends a 200-item `facilities` array.
11. **Timestamp Spoofing**: Public user creates `/property_submissions/WB-9003` with backdated `submittedAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()`.
12. **Notification Spoofing / Scraping**: Public or non-admin user tries to `list` `/admin_notifications` or create a notification with `type: "approved"` or `isRead: true`.
