import React from 'react';
import { MessageModalLayout, Modal } from '@wix/design-system';
import { GiftOption } from '../../../types';

interface DeleteConfirmModalProps {
  option: GiftOption | null;
  onCancel: () => void;
  onConfirm: (option: GiftOption) => void;
}

/** A destructive delete always confirms first - never removed straight from a row action. */
export function DeleteConfirmModal({ option, onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={!!option} onRequestClose={onCancel} shouldCloseOnOverlayClick>
      {option && (
        <MessageModalLayout
          skin="destructive"
          title={`Delete “${option.name}”?`}
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
          closeButtonProps={{ onClick: onCancel }}
          primaryButtonOnClick={() => onConfirm(option)}
          secondaryButtonOnClick={onCancel}
        >
          This removes the gift-wrap option from your configuration. Shoppers will no longer be able to select it,
          and this cannot be undone.
        </MessageModalLayout>
      )}
    </Modal>
  );
}
