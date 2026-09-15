import { additionalFees } from '@wix/ecom/service-plugins';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { COLLECTION_ID } from '../../../../shared/configuration';
import { GiftOption } from '../../../../types';
import { calculateModifierSelectedGiftFees } from '../../../gift-engine';
import { emitDiagnostic } from '../../../../shared/logger';
import { getAppEntitlement } from '../../../../shared/entitlement';

export async function calculateAdditionalFees(payload: Parameters<Parameters<typeof additionalFees.provideHandlers>[0]['calculateAdditionalFees']>[0]): Promise<additionalFees.CalculateAdditionalFeesResponse> {
  const start = Date.now();
  try {
    const [saved, entitlement] = await Promise.all([
      auth.elevate(items.query)(COLLECTION_ID).eq('_id', 'configuration').find({ consistentRead: true }),
      getAppEntitlement(),
    ]);
    const options = (saved.items[0]?.entries ?? []) as GiftOption[];
    const fees = calculateModifierSelectedGiftFees((payload.request.lineItems ?? []).map(item => ({
      id: item._id,
      quantity: item.quantity ?? 0,
      price: item.price ?? '0',
      modifierGroups: (item.modifierGroups ?? []).map(group => ({
        name: group.name?.original,
        modifiers: (group.modifiers ?? []).map(modifier => ({ label: modifier.label?.original, quantity: modifier.quantity ?? undefined })),
      })),
    })), options, entitlement);

    emitDiagnostic('additional_fees_calculated', {
      outcome: 'success',
      durationMs: Date.now() - start,
      surface: 'fee_rules',
      mode: 'real',
    });

    return { additionalFees: fees };
  } catch (error: any) {
    emitDiagnostic('additional_fees_calculated', {
      outcome: 'failure',
      durationMs: Date.now() - start,
      errorCode: 'CALCULATE_FEES_FAILED',
      surface: 'fee_rules',
      mode: 'real',
    });
    return { additionalFees: [] };
  }
}

export default additionalFees.provideHandlers({ calculateAdditionalFees });
