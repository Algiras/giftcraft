import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ sendBiEvent: vi.fn() }));
vi.mock('@wix/app-management', () => ({ biEvents: api }));

import { emitDiagnostic, markSetupFinished } from './logger';

beforeEach(() => vi.resetAllMocks());

describe('GiftCraft BI diagnostics', () => {
  it('sends an allowlisted diagnostic without sensitive details', async () => {
    api.sendBiEvent.mockResolvedValue(undefined);

    emitDiagnostic('storage_verification', {
      outcome: 'failure',
      durationMs: 25,
      errorCode: 'STORAGE_UNVERIFIED',
      wixRequestId: 'req-12345',
      customerName: 'Secret Customer',
    } as never);

    await vi.waitFor(() => expect(api.sendBiEvent).toHaveBeenCalledTimes(1));
    expect(api.sendBiEvent).toHaveBeenCalledWith({
      eventName: 'CUSTOM',
      customEventName: 'giftcraft_storage_verification',
      eventData: expect.objectContaining({
        app_version: '1.0.0',
        schema_version: '1',
        outcome: 'failure',
        surface: 'dashboard',
        duration_ms: '25',
        error_code: 'STORAGE_UNVERIFIED',
        wix_request_id: 'req-12345',
        timestamp: expect.any(String),
      }),
    });
  });

  it('does not reject or throw when BI ingress rejects', async () => {
    api.sendBiEvent.mockRejectedValue(new Error('BI network error'));

    expect(() => emitDiagnostic('configuration_load', { outcome: 'failure' })).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('does not throw when BI SDK initialization throws synchronously', () => {
    api.sendBiEvent.mockImplementation(() => { throw new Error('SDK unavailable'); });

    expect(() => emitDiagnostic('configuration_save', { outcome: 'failure' })).not.toThrow();
    expect(() => markSetupFinished()).not.toThrow();
  });

  it('allows surface and mode parameters', async () => {
    api.sendBiEvent.mockResolvedValue(undefined);

    emitDiagnostic('fee_rule_evaluated', { outcome: 'success', surface: 'fee_rules', mode: 'real' });

    await vi.waitFor(() => expect(api.sendBiEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventData: expect.objectContaining({ surface: 'fee_rules', mode: 'real' }),
    })));
  });

  it('reports completed setup with APP_SETUP_FINISHED', async () => {
    api.sendBiEvent.mockResolvedValue(undefined);

    markSetupFinished();

    await vi.waitFor(() => expect(api.sendBiEvent).toHaveBeenCalledWith({ eventName: 'APP_SETUP_FINISHED' }));
  });
});
