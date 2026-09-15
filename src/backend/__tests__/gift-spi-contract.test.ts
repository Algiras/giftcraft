import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ entries: [] as any[], isFree: false }));
vi.mock('@wix/data', () => ({ items: { query: () => ({ eq: () => ({ find: async () => ({ items: [{ entries: state.entries }] }) }) }) } }));
vi.mock('@wix/essentials', () => ({ auth: { elevate: (fn: unknown) => fn } }));
vi.mock('@wix/ecom/service-plugins', () => ({ additionalFees: { provideHandlers: (handlers: unknown) => handlers } }));
vi.mock('@wix/app-management', () => ({ appInstances: { getAppInstance: async () => ({ instance: { isFree: state.isFree } }) } }));
import handlers from '../service-plugins/ecom-additional-fees/gift-wrap/plugin';

beforeEach(() => { state.entries = []; state.isFree = false; });

it('charges only when the shopper selected a configured Wix product modifier', async () => {
 state.entries = [{ id: 'classic', name: 'Classic', price: 4.5, characterLimit: 200, freeCardThreshold: 100, enabled: true, taxable: true }];
 const payload = { request: { lineItems: [{ _id: 'line-1', quantity: 2, price: '20', modifierGroups: [
  { name: { original: 'GiftCraft wrap' }, modifiers: [{ label: { original: 'Classic' }, quantity: 2 }] },
  { name: { original: 'GiftCraft greeting card' }, modifiers: [{ label: { original: 'Yes' } }] },
 ] }] }, metadata: { currency: 'USD' } };
 expect(await (handlers as any).calculateAdditionalFees(payload)).toEqual({ additionalFees: [
  { code: 'GIFT_WRAP_CLASSIC', name: 'Gift wrapping: Classic', price: '9.00', taxDetails: { taxable: true }, lineItemIds: ['line-1'] },
  { code: 'GIFT_CARD_CLASSIC', name: 'Personalized greeting card', price: '5.00', taxDetails: { taxable: true }, lineItemIds: ['line-1'] },
 ] });
});

it('does not charge merely because a merchant configured an option', async () => {
 state.entries = [{ id: 'classic', name: 'Classic', price: 4.5, characterLimit: 200, enabled: true }];
 expect(await (handlers as any).calculateAdditionalFees({ request: { lineItems: [{ _id: 'line-1', quantity: 1, price: '20' }] }, metadata: {} })).toEqual({ additionalFees: [] });
});

it('never charges a Pro-only greeting-card fee for a free-plan instance, even when configured', async () => {
 state.isFree = true;
 state.entries = [{ id: 'classic', name: 'Classic', price: 4.5, characterLimit: 200, freeCardThreshold: 100, enabled: true, taxable: true }];
 const payload = { request: { lineItems: [{ _id: 'line-1', quantity: 1, price: '20', modifierGroups: [
  { name: { original: 'GiftCraft wrap' }, modifiers: [{ label: { original: 'Classic' }, quantity: 1 }] },
  { name: { original: 'GiftCraft greeting card' }, modifiers: [{ label: { original: 'Yes' } }] },
 ] }] }, metadata: { currency: 'USD' } };
 expect(await (handlers as any).calculateAdditionalFees(payload)).toEqual({ additionalFees: [
  { code: 'GIFT_WRAP_CLASSIC', name: 'Gift wrapping: Classic', price: '4.50', taxDetails: { taxable: true }, lineItemIds: ['line-1'] },
 ] });
});

it('limits a free-plan instance to a single enabled gift option, even if the merchant saved several', async () => {
 state.isFree = true;
 state.entries = [
  { id: 'classic', name: 'Classic', price: 4.5, characterLimit: 200, enabled: true, taxable: true },
  { id: 'luxury', name: 'Luxury', price: 9.99, characterLimit: 200, enabled: true, taxable: true },
 ];
 const payload = { request: { lineItems: [{ _id: 'line-1', quantity: 1, price: '20', modifierGroups: [
  { name: { original: 'GiftCraft wrap' }, modifiers: [{ label: { original: 'Luxury' } }] },
 ] }] }, metadata: {} };
 // Luxury was the second enabled option in the saved list, so the free-plan slot is
 // reserved by Classic - Luxury must not be applied.
 expect(await (handlers as any).calculateAdditionalFees(payload)).toEqual({ additionalFees: [] });
});
