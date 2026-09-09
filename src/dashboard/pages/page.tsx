import React, { useState } from 'react';
import {
  WixDesignSystemProvider,
  Page,
  Card,
  Table,
  Button,
  Badge,
  ToggleSwitch,
  Input,
  FormField,
  Modal,
  CustomModalLayout,
  Box,
  Heading,
  Text,
  Divider,
  Search,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { GiftOption, CheckoutLineItem, GiftSelection, WrapStyle } from '../../types';
import { evaluateGiftOptions, calculateSubtotal, validateGreetingMessage } from '../../backend/gift-engine';

const INITIAL_OPTIONS: GiftOption[] = [
  {
    id: 'opt-classic',
    name: 'Classic Crimson Ribbon',
    wrapStyle: 'classic_ribbon',
    price: 4.99,
    characterLimit: 200,
    freeThreshold: 75.00,
    freeCardThreshold: 50.00,
    giftWithPurchase: {
      minSubtotal: 120.00,
      giftProductName: 'Handcrafted Wood Keepsake Tag',
    },
    enabled: true,
    taxable: true,
    createdAt: '2026-09-01',
  },
  {
    id: 'opt-luxury',
    name: 'Luxury Velvet & Gold Embossed',
    wrapStyle: 'luxury_gold',
    price: 9.99,
    characterLimit: 300,
    freeThreshold: 150.00,
    freeCardThreshold: 100.00,
    giftWithPurchase: {
      minSubtotal: 200.00,
      giftProductName: 'Artisan Scented Candle (Travel Size)',
    },
    enabled: true,
    taxable: true,
    createdAt: '2026-09-02',
  },
  {
    id: 'opt-holiday',
    name: 'Festive Holiday Evergreen',
    wrapStyle: 'holiday_festive',
    price: 6.50,
    characterLimit: 250,
    freeThreshold: 90.00,
    freeCardThreshold: 60.00,
    giftWithPurchase: {
      requiredTag: 'holiday-promo',
      giftProductName: 'Limited Holiday Pine Ornament',
    },
    enabled: true,
    taxable: true,
    createdAt: '2026-09-04',
  },
  {
    id: 'opt-kraft',
    name: 'Eco-Friendly Recycled Kraft',
    wrapStyle: 'eco_kraft',
    price: 3.50,
    characterLimit: 150,
    freeThreshold: 50.00,
    enabled: false,
    taxable: false,
    createdAt: '2026-09-06',
  },
];

export default function GiftCraftDashboard() {
  const [options, setOptions] = useState<GiftOption[]>(INITIAL_OPTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for new gift option
  const [formName, setFormName] = useState('');
  const [formWrapStyle, setFormWrapStyle] = useState<WrapStyle>('classic_ribbon');
  const [formPrice, setFormPrice] = useState('5.00');
  const [formCharLimit, setFormCharLimit] = useState('200');
  const [formFreeThreshold, setFormFreeThreshold] = useState('80.00');
  const [formFreeCardThreshold, setFormFreeCardThreshold] = useState('50.00');
  const [formGwpProduct, setFormGwpProduct] = useState('');
  const [formGwpSubtotal, setFormGwpSubtotal] = useState('120.00');
  const [formError, setFormError] = useState<string | null>(null);

  // Simulator State
  const [simItems, setSimItems] = useState<CheckoutLineItem[]>([
    { id: 'item-1', catalogItemId: 'prod-scarf', productName: 'Cashmere Winter Scarf', price: 48.00, quantity: 1 },
    { id: 'item-2', catalogItemId: 'prod-mug', productName: 'Ceramic Artisan Mug', price: 22.00, quantity: 1, tags: ['holiday-promo'] },
  ]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-classic');
  const [includeGreetingCard, setIncludeGreetingCard] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState('Happy Holidays and warm wishes for the new year!');

  const updateSimQuantity = (index: number, newQty: number) => {
    const updated = [...simItems];
    updated[index].quantity = Math.max(0, newQty);
    setSimItems(updated.filter(it => it.quantity > 0));
  };

  const addSimItem = () => {
    const newItem: CheckoutLineItem = {
      id: `item-${Date.now()}`,
      catalogItemId: `prod-${Date.now()}`,
      productName: 'Handmade Aromatherapy Candle',
      price: 35.00,
      quantity: 1,
    };
    setSimItems([...simItems, newItem]);
  };

  const toggleOptionActive = (id: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, enabled: !o.enabled } : o));
  };

  const handleDeleteOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
    if (selectedOptionId === id) {
      const remaining = options.filter(o => o.id !== id);
      if (remaining.length > 0) setSelectedOptionId(remaining[0].id);
    }
  };

  const handleCreateOption = () => {
    if (!formName.trim()) {
      setFormError('Option name is required.');
      return;
    }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) {
      setFormError('Price must be a valid positive amount or 0.');
      return;
    }
    const charLimit = parseInt(formCharLimit, 10);
    if (isNaN(charLimit) || charLimit <= 0) {
      setFormError('Character limit must be greater than 0.');
      return;
    }

    const freeThreshold = formFreeThreshold ? parseFloat(formFreeThreshold) : undefined;
    const freeCardThreshold = formFreeCardThreshold ? parseFloat(formFreeCardThreshold) : undefined;
    const gwpMin = formGwpSubtotal ? parseFloat(formGwpSubtotal) : undefined;

    const newOption: GiftOption = {
      id: `opt-${Date.now()}`,
      name: formName.trim(),
      wrapStyle: formWrapStyle,
      price,
      characterLimit: charLimit,
      freeThreshold: isNaN(freeThreshold as number) ? undefined : freeThreshold,
      freeCardThreshold: isNaN(freeCardThreshold as number) ? undefined : freeCardThreshold,
      giftWithPurchase: formGwpProduct.trim() ? {
        giftProductName: formGwpProduct.trim(),
        minSubtotal: isNaN(gwpMin as number) ? undefined : gwpMin,
      } : undefined,
      enabled: true,
      taxable: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setOptions([newOption, ...options]);
    setIsModalOpen(false);
    setFormName('');
    setFormGwpProduct('');
    setFormError(null);
  };

  const currentSelection: GiftSelection = {
    optionId: selectedOptionId,
    includeGreetingCard,
    greetingMessage,
  };

  const simResult = evaluateGiftOptions({
    lineItems: simItems,
    selection: currentSelection,
    options,
  });

  const simSubtotal = calculateSubtotal(simItems);
  const activeCount = options.filter(o => o.enabled).length;
  const currentOption = options.find(o => o.id === selectedOptionId);
  const charValidation = validateGreetingMessage(greetingMessage, currentOption?.characterLimit || 200);

  const filteredOptions = options.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.wrapStyle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header
          title="GiftCraft: Gift Wrapping & Greeting Cards"
          subtitle="Configure customized gift wrapping, personalized cards, character limits, and gift-with-purchase checkout incentives."
          actionsBar={
            <Button priority="primary" onClick={() => setIsModalOpen(true)}>
              + Add Gift Option
            </Button>
          }
        />

        <Page.Content>
          {/* KPI Summary Cards */}
          <Box gap="16px" marginBottom="24px">
            <Box style={{ flex: 1 }}>
              <Card>
                <Card.Content>
                  <Text secondary size="small">Active Gift Options</Text>
                  <Heading size="medium">{activeCount} of {options.length} Active</Heading>
                  <Text size="tiny" skin="success">Ready for Wix Checkout</Text>
                </Card.Content>
              </Card>
            </Box>
            <Box style={{ flex: 1 }}>
              <Card>
                <Card.Content>
                  <Text secondary size="small">Average Gift Attach Rate</Text>
                  <Heading size="medium">+21.4%</Heading>
                  <Text size="tiny" skin="success">Higher AOV via seasonal wrap</Text>
                </Card.Content>
              </Card>
            </Box>
            <Box style={{ flex: 1 }}>
              <Card>
                <Card.Content>
                  <Text secondary size="small">Zero Hosting Overhead</Text>
                  <Heading size="medium">$0.00 / mo</Heading>
                  <Text size="tiny" skin="standard">100% Wix Native Serverless</Text>
                </Card.Content>
              </Card>
            </Box>
          </Box>

          {/* Configured Gift Options Table */}
          <Card>
            <Card.Header
              title="Configured Gift Wrapping Styles"
              subtitle="Shoppers can select these wrapping options with custom greeting messages in checkout."
              suffix={
                <Box width="280px">
                  <Search
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    placeholder="Search styles..."
                  />
                </Box>
              }
            />
            <Card.Content>
              <Table
                data={filteredOptions}
                columns={[
                  {
                    title: 'Style / Option Name',
                    render: (row: GiftOption) => (
                      <Box direction="vertical" gap="2px">
                        <Text weight="bold">{row.name}</Text>
                        <Text size="tiny" secondary>Created: {row.createdAt || 'Active'}</Text>
                      </Box>
                    ),
                  },
                  {
                    title: 'Wrap Style',
                    render: (row: GiftOption) => (
                      <Badge skin={row.wrapStyle === 'luxury_gold' ? 'warning' : row.wrapStyle === 'holiday_festive' ? 'premium' : 'general'}>
                        {row.wrapStyle.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ),
                  },
                  {
                    title: 'Wrap Price',
                    render: (row: GiftOption) => (
                      <Text weight="bold">${row.price.toFixed(2)}</Text>
                    ),
                  },
                  {
                    title: 'Free Wrap Threshold',
                    render: (row: GiftOption) => (
                      <Text size="small">
                        {row.freeThreshold ? `Free over $${row.freeThreshold.toFixed(2)}` : 'Standard rate'}
                      </Text>
                    ),
                  },
                  {
                    title: 'Card Limit & Waiver',
                    render: (row: GiftOption) => (
                      <Box direction="vertical" gap="2px">
                        <Text size="small">{row.characterLimit} chars max</Text>
                        {row.freeCardThreshold && (
                          <Text size="tiny" skin="success">Free card over ${row.freeCardThreshold.toFixed(2)}</Text>
                        )}
                      </Box>
                    ),
                  },
                  {
                    title: 'Bonus Incentive (GWP)',
                    render: (row: GiftOption) => (
                      row.giftWithPurchase ? (
                        <Badge skin="success">🎁 {row.giftWithPurchase.giftProductName}</Badge>
                      ) : (
                        <Text secondary size="small">—</Text>
                      )
                    ),
                  },
                  {
                    title: 'Status',
                    render: (row: GiftOption) => (
                      <Box align="center" gap="8px">
                        <ToggleSwitch
                          checked={row.enabled}
                          onChange={() => toggleOptionActive(row.id)}
                        />
                        <Text size="tiny">{row.enabled ? 'Enabled' : 'Disabled'}</Text>
                      </Box>
                    ),
                  },
                  {
                    title: 'Actions',
                    render: (row: GiftOption) => (
                      <Button
                        priority="secondary"
                        size="small"
                        skin="destructive"
                        onClick={() => handleDeleteOption(row.id)}
                      >
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

          {/* Interactive Live Checkout Simulator */}
          <Box marginTop="24px">
            <Card>
              <Card.Header
                title="Interactive Live Checkout Simulator"
                subtitle="Preview how your gift wrap options, greeting card limits, and free thresholds evaluate in real time."
                suffix={
                  <Button size="small" priority="secondary" onClick={addSimItem}>
                    + Add Demo Cart Item
                  </Button>
                }
              />
              <Card.Content>
                <Box gap="24px">
                  {/* Left Column: Cart & Customization */}
                  <Box direction="vertical" gap="16px" style={{ flex: 1.2 }}>
                    <Heading size="small">1. Shopper Cart Items</Heading>
                    {simItems.map((item, idx) => (
                      <Box
                        key={item.id}
                        align="center"
                        padding="12px"
                        style={{ justifyContent: 'space-between', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      >
                        <Box direction="vertical" gap="2px">
                          <Text weight="bold">{item.productName}</Text>
                          <Text secondary size="small">${Number(item.price).toFixed(2)} each</Text>
                          {item.tags && item.tags.length > 0 && (
                            <Text size="tiny" skin="premium">Tags: {item.tags.join(', ')}</Text>
                          )}
                        </Box>
                        <Box align="center" gap="8px">
                          <Button size="small" priority="secondary" onClick={() => updateSimQuantity(idx, item.quantity - 1)}>-</Button>
                          <Text weight="bold">{item.quantity}</Text>
                          <Button size="small" priority="secondary" onClick={() => updateSimQuantity(idx, item.quantity + 1)}>+</Button>
                          <Text weight="bold" style={{ minWidth: '70px', textAlign: 'right' }}>
                            ${(Number(item.price) * item.quantity).toFixed(2)}
                          </Text>
                        </Box>
                      </Box>
                    ))}

                    <Divider />

                    <Heading size="small">2. Gift Wrapping Option Selection</Heading>
                    <Box gap="8px" style={{ flexWrap: 'wrap' }}>
                      {options.filter(o => o.enabled).map(opt => (
                        <Button
                          key={opt.id}
                          size="small"
                          priority={selectedOptionId === opt.id ? 'primary' : 'secondary'}
                          onClick={() => setSelectedOptionId(opt.id)}
                        >
                          {opt.name} (${opt.price.toFixed(2)})
                        </Button>
                      ))}
                    </Box>

                    <Divider />

                    <Heading size="small">3. Personalized Greeting Message</Heading>
                    <Box align="center" gap="12px">
                      <ToggleSwitch
                        checked={includeGreetingCard}
                        onChange={() => setIncludeGreetingCard(!includeGreetingCard)}
                      />
                      <Text weight="bold">Include Printed Greeting Card</Text>
                    </Box>

                    {includeGreetingCard && (
                      <Box direction="vertical" gap="8px">
                        <FormField label={`Greeting Card Message (Max ${currentOption?.characterLimit || 200} characters)`}>
                          <Input
                            value={greetingMessage}
                            onChange={(e: any) => setGreetingMessage(e.target.value)}
                            placeholder="Write your personal gift message here..."
                          />
                        </FormField>
                        <Box align="center" style={{ justifyContent: 'space-between' }}>
                          <Text size="tiny" secondary>
                            Characters: {charValidation.currentLength} / {charValidation.limit}
                          </Text>
                          <Badge skin={charValidation.valid ? 'success' : 'danger'}>
                            {charValidation.valid ? 'Within Limit' : 'Exceeds Limit'}
                          </Badge>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Right Column: Checkout Breakdown */}
                  <Box
                    direction="vertical"
                    gap="14px"
                    style={{
                      flex: 0.8,
                      backgroundColor: '#f8fafc',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Heading size="small">Wix Checkout Order Summary</Heading>
                    <Divider />

                    <Box style={{ justifyContent: 'space-between' }}>
                      <Text>Cart Subtotal:</Text>
                      <Text weight="bold">${simSubtotal.toFixed(2)}</Text>
                    </Box>

                    {/* Free Wrap Progress */}
                    {currentOption?.freeThreshold && (
                      <Box direction="vertical" gap="4px" padding="8px" style={{ background: simSubtotal >= currentOption.freeThreshold ? '#ecfdf5' : '#eff6ff', borderRadius: '6px' }}>
                        <Text size="tiny" weight="bold" skin={simSubtotal >= currentOption.freeThreshold ? 'success' : 'standard'}>
                          {simSubtotal >= currentOption.freeThreshold
                            ? '✓ Free Gift Wrapping Unlocked!'
                            : `Add $${(currentOption.freeThreshold - simSubtotal).toFixed(2)} more for Free Wrapping`}
                        </Text>
                      </Box>
                    )}

                    {/* Gift with purchase banner */}
                    {simResult.isGiftWithPurchaseUnlocked && simResult.giftWithPurchaseItem && (
                      <Box direction="vertical" gap="2px" padding="8px" style={{ background: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
                        <Text size="tiny" weight="bold" style={{ color: '#92400e' }}>
                          🎁 Qualified for Free Gift:
                        </Text>
                        <Text size="small" weight="bold" style={{ color: '#78350f' }}>
                          {simResult.giftWithPurchaseItem}
                        </Text>
                      </Box>
                    )}

                    <Divider />

                    <Box style={{ justifyContent: 'space-between' }}>
                      <Text>Gift Wrapping ({currentOption?.name}):</Text>
                      <Text weight="bold" style={{ color: simResult.wrapFee === 0 ? '#15803d' : '#0f172a' }}>
                        {simResult.wrapFee === 0 ? 'FREE' : `$${simResult.wrapFee.toFixed(2)}`}
                      </Text>
                    </Box>

                    {includeGreetingCard && (
                      <Box style={{ justifyContent: 'space-between' }}>
                        <Text>Personalized Greeting Card:</Text>
                        <Text weight="bold" style={{ color: simResult.cardFee === 0 ? '#15803d' : '#0f172a' }}>
                          {simResult.cardFee === 0 ? 'FREE' : `$${simResult.cardFee.toFixed(2)}`}
                        </Text>
                      </Box>
                    )}

                    <Divider />

                    <Box style={{ justifyContent: 'space-between' }}>
                      <Heading size="small">Total Additional Fees:</Heading>
                      <Text weight="bold" size="medium" style={{ color: simResult.totalFee > 0 ? '#b91c1c' : '#15803d' }}>
                        ${simResult.totalFee.toFixed(2)}
                      </Text>
                    </Box>

                    <Box style={{ justifyContent: 'space-between' }}>
                      <Heading size="medium">Estimated Checkout Total:</Heading>
                      <Heading size="medium">
                        ${(simSubtotal + simResult.totalFee).toFixed(2)}
                      </Heading>
                    </Box>

                    <Box direction="vertical" gap="4px" marginTop="8px">
                      <Text size="tiny" secondary weight="bold">Evaluation Details:</Text>
                      {simResult.appliedDetails.map((detail, idx) => (
                        <Text key={idx} size="tiny" secondary>• {detail}</Text>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Card.Content>
            </Card>
          </Box>
        </Page.Content>

        {/* Add Gift Option Modal */}
        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          shouldCloseOnOverlayClick
        >
          <CustomModalLayout
            title="Add New Gift Wrapping Option"
            primaryButtonText="Save Gift Option"
            secondaryButtonText="Cancel"
            onCloseButtonClick={() => setIsModalOpen(false)}
            secondaryButtonOnClick={() => setIsModalOpen(false)}
            primaryButtonOnClick={handleCreateOption}
          >
            <Box direction="vertical" gap="16px" padding="16px">
              {formError && (
                <Text skin="error" size="small">{formError}</Text>
              )}

              <FormField label="Option Name (e.g. Emerald Holiday Wrap)" required>
                <Input
                  value={formName}
                  onChange={(e: any) => setFormName(e.target.value)}
                  placeholder="e.g. Classic Crimson Ribbon"
                />
              </FormField>

              <Box gap="16px">
                <Box style={{ flex: 1 }}>
                  <FormField label="Wrap Style">
                    <Input
                      value={formWrapStyle}
                      onChange={(e: any) => setFormWrapStyle(e.target.value as WrapStyle)}
                      placeholder="classic_ribbon, luxury_gold, holiday_festive, eco_kraft"
                    />
                  </FormField>
                </Box>
                <Box style={{ flex: 1 }}>
                  <FormField label="Wrap Fee ($)" required>
                    <Input
                      type="number"
                      value={formPrice}
                      onChange={(e: any) => setFormPrice(e.target.value)}
                    />
                  </FormField>
                </Box>
              </Box>

              <Box gap="16px">
                <Box style={{ flex: 1 }}>
                  <FormField label="Free Wrap Subtotal Threshold ($)">
                    <Input
                      type="number"
                      value={formFreeThreshold}
                      onChange={(e: any) => setFormFreeThreshold(e.target.value)}
                      placeholder="e.g. 75.00"
                    />
                  </FormField>
                </Box>
                <Box style={{ flex: 1 }}>
                  <FormField label="Greeting Message Max Characters">
                    <Input
                      type="number"
                      value={formCharLimit}
                      onChange={(e: any) => setFormCharLimit(e.target.value)}
                      placeholder="200"
                    />
                  </FormField>
                </Box>
              </Box>

              <Box gap="16px">
                <Box style={{ flex: 1 }}>
                  <FormField label="Free Card Subtotal Threshold ($)">
                    <Input
                      type="number"
                      value={formFreeCardThreshold}
                      onChange={(e: any) => setFormFreeCardThreshold(e.target.value)}
                      placeholder="e.g. 50.00"
                    />
                  </FormField>
                </Box>
                <Box style={{ flex: 1 }}>
                  <FormField label="Gift-with-Purchase Item (Optional)">
                    <Input
                      value={formGwpProduct}
                      onChange={(e: any) => setFormGwpProduct(e.target.value)}
                      placeholder="e.g. Deluxe Keepsake Tag"
                    />
                  </FormField>
                </Box>
              </Box>

              <FormField label="Gift-with-Purchase Min Subtotal ($)">
                <Input
                  type="number"
                  value={formGwpSubtotal}
                  onChange={(e: any) => setFormGwpSubtotal(e.target.value)}
                  placeholder="e.g. 120.00"
                />
              </FormField>
            </Box>
          </CustomModalLayout>
        </Modal>
      </Page>
    </WixDesignSystemProvider>
  );
}
