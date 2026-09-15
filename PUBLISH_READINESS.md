# GiftCraft linked-site publish readiness

**Local identity:** app `0ed8d640-b905-4fb7-b40b-379652fd6d07`; linked site `4f9c31b9-ddcf-4ae7-bd8e-d09d38e7694f`. The built manifest declares the dashboard page and `gift-wrap` Additional Fees extension, but no Data Collections component. Matching native product modifiers are required; greeting text, fulfillment handoff, and gift-with-purchase are unwired.

## Acceptance runbook

1. Confirm app/site identity, dashboard page, and Additional Fees registration; enable CMS and Stores. **Stop** if they differ.
2. Register/build a compatible Data Collections extension. Grant only Manage Data Collections, Read Data Items, and Write Data Items; restart after scope changes. **Stop** if absent/unbuildable or setup fails; retain the Wix request ID.
3. Run setup and re-list `GiftCraftOptions`: `entries ARRAY`; read/insert/update/remove all `ADMIN`. **Stop** for a mismatch; do not overwrite an existing table.
4. Save/reload one gift option. Configure modifier `GiftCraft wrap` with an option label exactly matching it; if used, `GiftCraft greeting card` must be `Yes`. **Stop** if persistence or exact matching fails.
5. Run matching and nonmatching real carts through checkout and inspect the resulting order. Confirm the fee occurs only for the matching selection. **Stop** on another result.

Do not advertise or price Pro-only capability: runtime billing entitlement enforcement is not implemented. Record identities, scopes, metadata, option persistence, modifier setup, cart/order outcomes, and request IDs.
