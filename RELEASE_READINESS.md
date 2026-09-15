# GiftCraft release readiness

Local checks cover the engine logic, storage schema, entitlement guard, and build only. They do not prove the installed app is ready on a live merchant site.

Before release, verify on one linked test site following Workflow 10 and Workflow 13:

1. **Identity & Manifest**: Local app ID `0ed8d640-b905-4fb7-b40b-379652fd6d07` must match Dev Center app definition. Dashboard page and extension (`ecom-additional-fees`) must be active.
2. **Infrastructure & CMS**: 100% Wix infrastructure with zero external servers or databases. The `GiftCraftOptions` collection must be provisioned via the Data Collections extension with PRIVILEGED item permissions.
3. **First-Run Setup Verification**: On first dashboard load, storage verification checks collection presence. If missing, surfaces the actionable `<Badge skin="warning">Storage setup needed</Badge>` card without crashing.
4. **Functional Acceptance**: Create and save a valid configuration entry, reload the dashboard, and confirm the persisted state matches. Verify storefront/checkout behavior for matching and non-matching scenarios.
5. **Monetization & Billing**: Verify Wix Billing Freemium model (14-day free trial, Basic Free tier, Pro tier at $4.99/mo). Free merchants can access basic features, while Pro-gated features prompt the native Wix Billing upgrade dialog (`manage.wix.com/premium-purchase-plan/dynamo`).
6. **Telemetry & Diagnostics**: Confirm zero-infra telemetry (`biEvents` + `emitDiagnostic` + `markSetupFinished`) fires on key actions and logs are retrievable from the Wix deployed runtime.

Retain the Wix request ID for any platform failure; a local build or test run alone is not release evidence.
