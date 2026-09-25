import { AppLogger, createDiagnostics } from '@wix-extensions/core/telemetry';

export { AppLogger, isSetupFinished, resetSetupStateForTesting, markSetupFinished } from '@wix-extensions/core/telemetry';
export type { LogPayload } from '@wix-extensions/core/telemetry';

/**
 * Zero-Infra Telemetry & Structured Logger for GiftCraft.
 * Wix Developer Center native monitoring with zero external servers.
 *
 * The AppLogger class, isSetupFinished/resetSetupStateForTesting,
 * markSetupFinished and markDashboardLoaded are @wix-extensions/core/telemetry
 * re-exports (identical behavior). emitDiagnostic now delegates to core's
 * `createDiagnostics` too: core emits the same snake_case wire schema
 * (app_version/schema_version/duration_ms/...) GiftCraft always used, and its
 * `DiagnosticSurface` union is now open (`string & {}`), so the local 'fee_rules'
 * surface value that used to be rejected by core's closed union now typechecks
 * and survives into the payload unchanged. The GiftCraft-specific
 * DiagnosticEventName/DiagnosticInput types stay local purely for narrower
 * autocomplete at call sites; they are structurally assignable to core's (open)
 * equivalents.
 */
export type DiagnosticEventName =
  | 'storage_metadata_read'
  | 'storage_permissions_read'
  | 'storage_read'
  | 'storage_write'
  | 'storage_verification'
  | 'storage_initialization'
  | 'configuration_load'
  | 'configuration_save'
  | 'dashboard_error'
  | 'client_error'
  | 'upgrade_click'
  | 'fee_rule_evaluated'
  | 'app_installed'
  | 'app_removed'
  | 'app_paid_plan_changed'
  | 'gift_automation_report'
  | 'additional_fees_calculated';

export type DiagnosticOutcome = 'success' | 'failure';

export type DiagnosticInput = {
  outcome: DiagnosticOutcome;
  durationMs?: number;
  errorCode?: string;
  wixRequestId?: string;
  surface?: 'dashboard' | 'fee_rules' | 'spi' | 'backend_event';
  mode?: 'sample' | 'real';
  /** 'uncaught_error'/'unhandled_rejection' from installGlobalErrorReporting, forwarded for 'client_error' events. */
  kind?: 'uncaught_error' | 'unhandled_rejection';
  /** Short merchant-quotable reference from DashboardErrorBoundary, forwarded for 'dashboard_error' events so a support report can be matched to this diagnostic. */
  reference?: string;
};

const APP_NAME = 'giftcraft';
const APP_VERSION = '1.0.0';

const diagnostics = createDiagnostics({ appName: APP_NAME, appVersion: APP_VERSION, schemaVersion: '1' });

/**
 * Best-effort, client-side Wix BI ingress. Deliberately not awaited by callers:
 * diagnostics must never block the primary app operation (core's implementation
 * swallows send failures the same way GiftCraft's local version used to).
 */
export function emitDiagnostic(eventName: DiagnosticEventName, input: DiagnosticInput): void {
  diagnostics.emitDiagnostic(eventName, input);
}

/** Call once when the app's dashboard page mounts; measures install -> visit adoption. */
export const markDashboardLoaded = diagnostics.markDashboardLoaded;

/**
 * Elevated diagnostics surface for BACKEND-ONLY callers (SPI plugins, backend
 * verification/lifecycle code). Backend contexts have no merchant session, so
 * a plain BI send fails with "Missing authentication information" — these
 * must go through `auth.elevate`. This module is also imported by dashboard
 * code (`emitDiagnostic`/`markDashboardLoaded` above), which must NOT
 * elevate, so backend callers import `emitBackendDiagnostic` instead of
 * `emitDiagnostic`.
 */
const backendDiagnostics = createDiagnostics({ appName: APP_NAME, appVersion: APP_VERSION, schemaVersion: '1', elevated: true });

export function emitBackendDiagnostic(eventName: DiagnosticEventName, input: DiagnosticInput): void {
  backendDiagnostics.emitDiagnostic(eventName, input);
}

class GiftCraftLogger extends AppLogger {
  trackUsage(event: string, metrics: Record<string, number | string | boolean>): void {
    const payload = {
      app: APP_NAME,
      version: APP_VERSION,
      event: `USAGE_${event.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      metrics,
    };
    console.info(`[TELEMETRY:USAGE] ${JSON.stringify(payload)}`);
  }
}

export const logger = new GiftCraftLogger(APP_NAME, APP_VERSION);
