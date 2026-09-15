import React, { useState } from 'react';
import { Box, Button, Card, Search, Table, TableToolbar, Text, ToggleSwitch, Tooltip } from '@wix/design-system';
import { FormattedMessage, useIntl } from 'react-intl';
import { GiftOption, WrapStyle } from '../../../types';
import { FREE_PLAN_MAX_ENABLED_OPTIONS } from '../../../backend/gift-engine';

interface GiftOptionsTableProps {
  options: GiftOption[];
  isPaid: boolean;
  busy: boolean;
  onToggleOption: (id: string) => void;
  onRequestDelete: (option: GiftOption) => void;
}

const WRAP_STYLE_MESSAGE_IDS: Record<WrapStyle, string> = {
  classic_ribbon: 'app.wrapStyle.classicRibbon',
  luxury_gold: 'app.wrapStyle.luxuryGold',
  eco_kraft: 'app.wrapStyle.ecoKraft',
  holiday_festive: 'app.wrapStyle.holidayFestive',
  custom: 'app.wrapStyle.custom',
};

/** Wrap-style display names are translated via this message map; the stored value is unchanged. */
function wrapStyleLabel(intl: ReturnType<typeof useIntl>, wrapStyle: string): string {
  const id = WRAP_STYLE_MESSAGE_IDS[wrapStyle as WrapStyle];
  if (!id) return wrapStyle.replace(/_/g, ' ');
  return intl.formatMessage({ id, defaultMessage: wrapStyle.replace(/_/g, ' ') });
}

export function GiftOptionsTable({ options, isPaid, busy, onToggleOption, onRequestDelete }: GiftOptionsTableProps) {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const enabledCount = options.filter(option => option.enabled).length;
  const limitTooltipText = intl.formatMessage({ id: 'app.page.basicPlanLimitToast', defaultMessage: 'The Basic plan includes one active gift-wrap option. Upgrade to Pro to run more at once.' });

  const formatCurrency = (value: number) => intl.formatNumber(value, { style: 'currency', currency: 'USD' });

  const filteredOptions = options.filter(
    option =>
      option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.wrapStyle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <Card.Header
        title={intl.formatMessage({ id: 'app.table.title', defaultMessage: 'Gift options' })}
        subtitle={intl.formatMessage({ id: 'app.table.subtitle', defaultMessage: "Option names must match the native store modifier the shopper selects at checkout." })}
      />
      <TableToolbar>
        <TableToolbar.ItemGroup position="start">
          <TableToolbar.Item>
            <TableToolbar.Label>
              {intl.formatMessage(
                { id: 'app.table.optionCount', defaultMessage: '{count, plural, one {# option} other {# options}}' },
                { count: options.length }
              )}
            </TableToolbar.Label>
          </TableToolbar.Item>
        </TableToolbar.ItemGroup>
        <TableToolbar.ItemGroup position="end">
          <TableToolbar.Item>
            <Box width="240px">
              <Search
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'app.table.searchPlaceholder', defaultMessage: 'Search styles...' })}
              />
            </Box>
          </TableToolbar.Item>
        </TableToolbar.ItemGroup>
      </TableToolbar>
      <Card.Content>
        <Table
          data={filteredOptions}
          columns={[
            {
              title: intl.formatMessage({ id: 'app.table.colOptionName', defaultMessage: 'Option name' }),
              render: (row: GiftOption) => (
                <Box direction="vertical" gap="2px">
                  <Text weight="bold">{row.name}</Text>
                  <Text size="tiny" secondary>
                    {row.createdAt
                      ? intl.formatMessage({ id: 'app.table.addedOn', defaultMessage: 'Added {date}' }, { date: row.createdAt })
                      : intl.formatMessage({ id: 'app.table.addedRecently', defaultMessage: 'Added recently' })}
                  </Text>
                </Box>
              ),
            },
            {
              title: intl.formatMessage({ id: 'app.table.colWrapStyle', defaultMessage: 'Wrap style' }),
              render: (row: GiftOption) => (
                <Text size="small">{wrapStyleLabel(intl, row.wrapStyle)}</Text>
              ),
            },
            {
              title: intl.formatMessage({ id: 'app.table.colWrapFee', defaultMessage: 'Wrap fee' }),
              render: (row: GiftOption) => <Text weight="bold">{formatCurrency(row.price)}</Text>,
            },
            {
              title: intl.formatMessage({ id: 'app.table.colFreeWrapOver', defaultMessage: 'Free wrap over' }),
              render: (row: GiftOption) =>
                row.freeThreshold ? (
                  <Text size="small">{formatCurrency(row.freeThreshold)}</Text>
                ) : (
                  <Text size="small" secondary><FormattedMessage id="app.table.alwaysCharged" defaultMessage="Always charged" /></Text>
                ),
            },
            {
              title: intl.formatMessage({ id: 'app.table.colGreetingCard', defaultMessage: 'Greeting card' }),
              render: (row: GiftOption) =>
                row.freeCardThreshold !== undefined ? (
                  <Text size="tiny" skin="success">
                    {intl.formatMessage({ id: 'app.table.freeOverAmount', defaultMessage: 'Free over {amount}' }, { amount: formatCurrency(row.freeCardThreshold) })}
                  </Text>
                ) : (
                  <Text size="small" secondary><FormattedMessage id="app.table.notOffered" defaultMessage="Not offered" /></Text>
                ),
            },
            {
              title: intl.formatMessage({ id: 'app.table.colGiftWithPurchase', defaultMessage: 'Gift with purchase' }),
              render: (row: GiftOption) =>
                row.giftWithPurchase ? (
                  <Text size="small" skin="success">{row.giftWithPurchase.giftProductName}</Text>
                ) : (
                  <Text size="small" secondary><FormattedMessage id="app.table.none" defaultMessage="None" /></Text>
                ),
            },
            {
              title: intl.formatMessage({ id: 'app.table.colActive', defaultMessage: 'Active' }),
              render: (row: GiftOption) => {
                const wouldExceedFreeLimit = !isPaid && !row.enabled && enabledCount >= FREE_PLAN_MAX_ENABLED_OPTIONS;
                const toggle = (
                  <ToggleSwitch
                    checked={row.enabled}
                    disabled={busy || wouldExceedFreeLimit}
                    onChange={() => onToggleOption(row.id)}
                  />
                );
                return (
                  <Box align="center" gap="8px">
                    {wouldExceedFreeLimit ? (
                      <Tooltip content={limitTooltipText}>
                        {toggle}
                      </Tooltip>
                    ) : (
                      toggle
                    )}
                    <Text size="tiny">
                      {row.enabled
                        ? <FormattedMessage id="app.table.enabled" defaultMessage="Enabled" />
                        : <FormattedMessage id="app.table.disabled" defaultMessage="Disabled" />}
                    </Text>
                  </Box>
                );
              },
            },
            {
              title: intl.formatMessage({ id: 'app.table.colActions', defaultMessage: 'Actions' }),
              render: (row: GiftOption) => (
                <Button priority="secondary" size="small" skin="destructive" disabled={busy} onClick={() => onRequestDelete(row)}>
                  <FormattedMessage id="app.common.delete" defaultMessage="Delete" />
                </Button>
              ),
            },
          ]}
        >
          <Table.Content />
        </Table>
      </Card.Content>
    </Card>
  );
}
