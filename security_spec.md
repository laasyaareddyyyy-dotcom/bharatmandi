# Security Specification: PhoolMitra Mandi

## 1. Data Invariants
1. **Ownership Invariant**: All business documents (`merchants`, `farmers`, `lots`, `shipments`, `payments`, `settlements`, `accounts`) must be tagged with `ownerUid` or `authorUid` or `userUid` that matches the authenticated user `request.auth.uid`.
2. **Access Isolation**: A merchant cannot read or modify another merchant's lots, payments, settlements, or farmer rosters.
3. **Immutability of Key Identity Fields**: Document IDs, `ownerUid`, and original timestamps cannot be altered upon update.
4. **Input Length & Boundary Constraints**: String lengths, numeric boundaries (e.g., quantities, amounts >= 0), and status enumerations must be verified.
5. **Authenticated Gate**: Unauthenticated users (`request.auth == null`) are denied read and write across all collections.
6. **Support Ticket Collaboration**: Help tickets can be read and updated by their author or verified staff.

## 2. Dirty Dozen Attack Payloads
1. **Unauthenticated Read/Write**: Attempt to read `/lots/lot123` with `request.auth = null` -> DENIED.
2. **Identity Spoofing on Lot Creation**: User `uid_alice` attempts to create a lot with `ownerUid = 'uid_bob'` -> DENIED.
3. **Cross-Tenant Lot Modification**: User `uid_alice` attempts to update lot owned by `uid_bob` -> DENIED.
4. **Cross-Tenant Payment Deletion**: User `uid_alice` attempts to delete a payment record owned by `uid_bob` -> DENIED.
5. **Ghost Field Injection (Shadow Update)**: Sending extraneous non-whitelisted admin privilege fields during lot update -> DENIED.
6. **Negative Quantity Poisoning**: Creating a lot with `quantity = -50` -> DENIED.
7. **Negative Payout Amount Poisoning**: Creating a payment with `amount = -1000` -> DENIED.
8. **Oversized String Buffer Overflow Attack**: Injecting a 2MB string into `farmerName` or `flowerVariety` -> DENIED.
9. **Invalid Document ID Poisoning**: Using a 500-byte non-alphanumeric document ID with injection characters -> DENIED.
10. **Immutable OwnerUid Modification**: Attempting to transfer ownership of a merchant profile by modifying `ownerUid` -> DENIED.
11. **Illegal Status State Escalation**: Modifying status to an arbitrary string not in `['Paid', 'Unpaid', 'Partial']` -> DENIED.
12. **Blanket Query Scraping**: Attempting a collection-level list scan without filtering by `ownerUid == request.auth.uid` -> DENIED.
