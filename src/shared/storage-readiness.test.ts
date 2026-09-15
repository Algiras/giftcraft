import { describe, expect, it, vi } from 'vitest';
import { confirmStorageWithAutoRetry, type StorageReadinessAssessment } from './storage-readiness';

describe('confirmStorageWithAutoRetry', () => {
  it('returns immediately when storage is ready', async () => {
    const check = vi.fn(async (): Promise<StorageReadinessAssessment> => ({
      ready: true,
      state: 'ready',
      message: '',
    }));

    const result = await confirmStorageWithAutoRetry(check, { retryDelaysMs: [1, 1, 1] });

    expect(result.ready).toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('polls while Wix is still provisioning collections', async () => {
    vi.useFakeTimers();
    const check = vi
      .fn<() => Promise<StorageReadinessAssessment>>()
      .mockResolvedValueOnce({ ready: false, state: 'provisioning', message: 'wait' })
      .mockResolvedValueOnce({ ready: false, state: 'provisioning', message: 'wait' })
      .mockResolvedValueOnce({ ready: true, state: 'ready', message: '' });

    const pending = confirmStorageWithAutoRetry(check, { retryDelaysMs: [1000, 1000] });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.ready).toBe(true);
    expect(check).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('stops polling when failure is not provisioning', async () => {
    const check = vi.fn(async (): Promise<StorageReadinessAssessment> => ({
      ready: false,
      state: 'permission',
      message: 'Complete Setup',
    }));

    const result = await confirmStorageWithAutoRetry(check, { retryDelaysMs: [1000, 1000] });

    expect(result.state).toBe('permission');
    expect(check).toHaveBeenCalledTimes(1);
  });
});
