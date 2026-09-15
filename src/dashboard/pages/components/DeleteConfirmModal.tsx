import React from 'react';
import { MessageModalLayout, Modal } from '@wix/design-system';
import { FormattedMessage, useIntl } from 'react-intl';
import { GiftOption } from '../../../types';

interface DeleteConfirmModalProps {
  option: GiftOption | null;
  onCancel: () => void;
  onConfirm: (option: GiftOption) => void;
}

/** A destructive delete always confirms first - never removed straight from a row action. */
export function DeleteConfirmModal({ option, onCancel, onConfirm }: DeleteConfirmModalProps) {
  const intl = useIntl();
  return (
    <Modal isOpen={!!option} onRequestClose={onCancel} shouldCloseOnOverlayClick>
      {option && (
        <MessageModalLayout
          skin="destructive"
          title={intl.formatMessage({ id: 'app.deleteModal.title', defaultMessage: 'Delete "{name}"?' }, { name: option.name })}
          primaryButtonText={intl.formatMessage({ id: 'app.common.delete', defaultMessage: 'Delete' })}
          secondaryButtonText={intl.formatMessage({ id: 'app.common.cancel', defaultMessage: 'Cancel' })}
          closeButtonProps={{ onClick: onCancel }}
          primaryButtonOnClick={() => onConfirm(option)}
          secondaryButtonOnClick={onCancel}
        >
          <FormattedMessage
            id="app.deleteModal.body"
            defaultMessage="This removes the gift-wrap option from your configuration. Shoppers will no longer be able to select it, and this cannot be undone."
          />
        </MessageModalLayout>
      )}
    </Modal>
  );
}
