import React, { useState } from 'react';
import { Box, Button, Card, Search, Table, TableToolbar, Text, ToggleSwitch, Tooltip } from '@wix/design-system';
import { GiftOption } from '../../../types';
import { FREE_PLAN_MAX_ENABLED_OPTIONS } from '../../../backend/gift-engine';

interface GiftOptionsTableProps {
  options: GiftOption[];
  isPaid: boolean;
  busy: boolean;
  onToggleOption: (id: string) => void;
  onRequestDelete: (option: GiftOption) => void;
}

export function GiftOptionsTable({ options, isPaid, busy, onToggleOption, onRequestDelete }: GiftOptionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const enabledCount = options.filter(option => option.enabled).length;

  const filteredOptions = options.filter(
    option =>
      option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.wrapStyle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <Card.Header
        title="Gift options"
        subtitle="Option names must match the native store modifier the shopper selects at checkout."
      />
      <TableToolbar>
        <TableToolbar.ItemGroup position="start">
          <TableToolbar.Item>
            <TableToolbar.Label>{`${options.length} ${options.length === 1 ? 'option' : 'options'}`}</TableToolbar.Label>
          </TableToolbar.Item>
        </TableToolbar.ItemGroup>
        <TableToolbar.ItemGroup position="end">
          <TableToolbar.Item>
            <Box width="240px">
              <Search
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                placeholder="Search styles..."
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
              title: 'Option name',
              render: (row: GiftOption) => (
                <Box direction="vertical" gap="2px">
                  <Text weight="bold">{row.name}</Text>
                  <Text size="tiny" secondary>Added {row.createdAt || 'recently'}</Text>
                </Box>
              ),
            },
            {
              title: 'Wrap style',
              render: (row: GiftOption) => (
                <Text size="small">{row.wrapStyle.replace(/_/g, ' ')}</Text>
              ),
            },
            {
              title: 'Wrap fee',
              render: (row: GiftOption) => <Text weight="bold">${row.price.toFixed(2)}</Text>,
            },
            {
              title: 'Free wrap over',
              render: (row: GiftOption) =>
                row.freeThreshold ? (
                  <Text size="small">${row.freeThreshold.toFixed(2)}</Text>
                ) : (
                  <Text size="small" secondary>Always charged</Text>
                ),
            },
            {
              title: 'Greeting card',
              render: (row: GiftOption) =>
                row.freeCardThreshold !== undefined ? (
                  <Text size="tiny" skin="success">Free over ${row.freeCardThreshold.toFixed(2)}</Text>
                ) : (
                  <Text size="small" secondary>Not offered</Text>
                ),
            },
            {
              title: 'Gift with purchase',
              render: (row: GiftOption) =>
                row.giftWithPurchase ? (
                  <Text size="small" skin="success">{row.giftWithPurchase.giftProductName}</Text>
                ) : (
                  <Text size="small" secondary>None</Text>
                ),
            },
            {
              title: 'Active',
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
                      <Tooltip content="The Basic plan includes one active gift-wrap option. Upgrade to Pro to run more at once.">
                        {toggle}
                      </Tooltip>
                    ) : (
                      toggle
                    )}
                    <Text size="tiny">{row.enabled ? 'Enabled' : 'Disabled'}</Text>
                  </Box>
                );
              },
            },
            {
              title: 'Actions',
              render: (row: GiftOption) => (
                <Button priority="secondary" size="small" skin="destructive" disabled={busy} onClick={() => onRequestDelete(row)}>
                  Delete
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
