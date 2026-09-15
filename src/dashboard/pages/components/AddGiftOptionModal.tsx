import React, { useState } from 'react';
import { Box, CustomModalLayout, FormField, Input, Modal, NumberInput, SectionHelper, Text } from '@wix/design-system';
import { GiftOption, WrapStyle } from '../../../types';

interface AddGiftOptionModalProps {
  isOpen: boolean;
  isPaid: boolean;
  onClose: () => void;
  onCreate: (option: GiftOption) => void;
}

const WRAP_STYLES: WrapStyle[] = ['classic_ribbon', 'luxury_gold', 'eco_kraft', 'holiday_festive', 'custom'];

export function AddGiftOptionModal({ isOpen, isPaid, onClose, onCreate }: AddGiftOptionModalProps) {
  const [name, setName] = useState('');
  const [wrapStyle, setWrapStyle] = useState<WrapStyle>('classic_ribbon');
  const [price, setPrice] = useState(5);
  const [characterLimit, setCharacterLimit] = useState(200);
  const [freeThreshold, setFreeThreshold] = useState<number | undefined>(undefined);
  const [freeCardThreshold, setFreeCardThreshold] = useState<number | undefined>(undefined);
  const [gwpProduct, setGwpProduct] = useState('');
  const [gwpSubtotal, setGwpSubtotal] = useState<number | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const reset = () => {
    setName('');
    setWrapStyle('classic_ribbon');
    setPrice(5);
    setCharacterLimit(200);
    setFreeThreshold(undefined);
    setFreeCardThreshold(undefined);
    setGwpProduct('');
    setGwpSubtotal(undefined);
    setNameError(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setNameError('Enter a name that matches the store modifier option label.');
      return;
    }
    onCreate({
      id: `opt-${Date.now()}`,
      name: name.trim(),
      wrapStyle,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      characterLimit: Number.isFinite(characterLimit) && characterLimit > 0 ? characterLimit : 200,
      freeThreshold: isPaid ? freeThreshold : undefined,
      freeCardThreshold: isPaid ? freeCardThreshold : undefined,
      giftWithPurchase: isPaid && gwpProduct.trim() ? { giftProductName: gwpProduct.trim(), minSubtotal: gwpSubtotal } : undefined,
      enabled: true,
      taxable: true,
      createdAt: new Date().toISOString().split('T')[0],
    });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} shouldCloseOnOverlayClick>
      <CustomModalLayout
        title="Add a gift-wrap option"
        primaryButtonText="Save gift option"
        secondaryButtonText="Cancel"
        closeButtonProps={{ onClick: handleClose }}
        secondaryButtonOnClick={handleClose}
        primaryButtonOnClick={handleCreate}
      >
        <Box direction="vertical" gap="16px">
          <FormField
            label="Option name"
            required
            infoContent="Must exactly match the option label on your store's “GiftCraft wrap” product modifier."
            status={nameError ? 'error' : undefined}
            statusMessage={nameError}
          >
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. Classic Crimson Ribbon" />
          </FormField>

          <Box gap="16px">
            <Box flexGrow={1}>
              <FormField label="Wrap style">
                <Input
                  value={wrapStyle}
                  onChange={(e: any) => setWrapStyle(e.target.value as WrapStyle)}
                  placeholder={WRAP_STYLES.join(', ')}
                />
              </FormField>
            </Box>
            <Box flexGrow={1}>
              <FormField label="Wrap fee" required infoContent="Charged when the shopper selects this wrap option.">
                <NumberInput value={price} onChange={(value: number | null) => setPrice(value ?? 0)} prefix={<Text>$</Text>} min={0} step={0.5} />
              </FormField>
            </Box>
          </Box>

          <FormField label="Greeting message character limit" infoContent="Shown to shoppers as the maximum length for a personalized message.">
            <NumberInput value={characterLimit} onChange={(value: number | null) => setCharacterLimit(value ?? 200)} min={1} step={10} />
          </FormField>

          {!isPaid && (
            <SectionHelper skin="premium" title="Pro-only settings">
              Free-wrap thresholds, greeting cards, and gift-with-purchase rules are part of the Pro plan. Upgrade to
              configure them for this option.
            </SectionHelper>
          )}

          <Box gap="16px">
            <Box flexGrow={1}>
              <FormField label="Free wrap over subtotal" infoContent="Leave blank to always charge the wrap fee.">
                <NumberInput
                  disabled={!isPaid}
                  value={freeThreshold}
                  onChange={(value: number | null) => setFreeThreshold(value ?? undefined)}
                  prefix={<Text>$</Text>}
                  min={0}
                />
              </FormField>
            </Box>
            <Box flexGrow={1}>
              <FormField label="Free greeting card over subtotal">
                <NumberInput
                  disabled={!isPaid}
                  value={freeCardThreshold}
                  onChange={(value: number | null) => setFreeCardThreshold(value ?? undefined)}
                  prefix={<Text>$</Text>}
                  min={0}
                />
              </FormField>
            </Box>
          </Box>

          <Box gap="16px">
            <Box flexGrow={1}>
              <FormField label="Gift-with-purchase item (optional)">
                <Input disabled={!isPaid} value={gwpProduct} onChange={(e: any) => setGwpProduct(e.target.value)} placeholder="e.g. Deluxe keepsake tag" />
              </FormField>
            </Box>
            <Box flexGrow={1}>
              <FormField label="Gift-with-purchase minimum subtotal">
                <NumberInput
                  disabled={!isPaid}
                  value={gwpSubtotal}
                  onChange={(value: number | null) => setGwpSubtotal(value ?? undefined)}
                  prefix={<Text>$</Text>}
                  min={0}
                />
              </FormField>
            </Box>
          </Box>
        </Box>
      </CustomModalLayout>
    </Modal>
  );
}
