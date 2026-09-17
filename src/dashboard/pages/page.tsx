import { withIntlProvider } from '../../intl/withIntlProvider';
import { FormattedMessage, useIntl } from 'react-intl';
import React, { useState, useEffect, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';
import { WixDesignSystemProvider, Page, Box, Card, Heading, Text, Loader, Button, EmptyState } from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { appInstances } from '@wix/app-management';
import { assessConfigurationStorage, loadConfiguration, saveConfiguration } from '../../shared/configuration';
import { confirmStorageWithAutoRetry, extractRequestId, type StorageSetupState } from '../../shared/storage-readiness';
import { emitDiagnostic, markDashboardLoaded, markSetupFinished } from '../../shared/logger';
import { showAppToast } from '../../shared/toast';
import { AppEntitlement, canUsePaidFeatures, getAppEntitlement, getWixPricingPageUrl } from '../../shared/entitlement';
import { GiftOption, CheckoutLineItem, GiftSelection } from '../../types';
import { evaluateGiftOptions, calculateSubtotal, validateGreetingMessage, restrictGiftOptionsForPlan, FREE_PLAN_MAX_ENABLED_OPTIONS } from '../../backend/gift-engine';
import { PlanStatusCard } from './components/PlanStatusCard';
import { StorageStatusCard } from './components/StorageStatusCard';
import { GiftOptionsTable } from './components/GiftOptionsTable';
import { AddGiftOptionModal } from './components/AddGiftOptionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CheckoutPreviewCard } from './components/CheckoutPreviewCard';
import { resolveEcommerceInstalled, WIX_STORES_APP_MARKET_URL, type EcommerceInstallState } from '../../shared/ecommerce';
import { loadStoreCurrency } from '../../shared/store-currency';
export const APP_ID = '0ed8d640-b905-4fb7-b40b-379652fd6d07';
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}
export /** Error fallback lives in a function component so it can use the `useIntl`
 * hook; a class component cannot, and Wix Design System string props such as
 * `title`/`subtitle` must receive strings rather than elements. */
function ErrorBoundaryFallback({ error, onRetry }: { error: string; onRetry: () => void }) {
  const intl = useIntl();
  return <WixDesignSystemProvider>
      <Page height="100vh">
        <Page.Header title={intl.formatMessage({ id: 'app.error.pageTitle', defaultMessage: 'GiftCraft: Wrap & Cards' })} subtitle={intl.formatMessage({ id: 'app.error.recoveringSubtitle', defaultMessage: 'Error recovering dashboard view' })} />
        <Page.Content>
          <Card>
            <Card.Content>
              <Box direction="vertical" gap="12px">
                <Heading size="small"><FormattedMessage id="app.error.loadFailedHeading" defaultMessage="Something went wrong loading the dashboard." /></Heading>
                <Text size="small" secondary>
                  {error || <FormattedMessage id="app.error.unexpectedError" defaultMessage="An unexpected error occurred in the dashboard." />}
                </Text>
                <Box gap="8px">
                  <Button size="small" onClick={onRetry}>
                    <FormattedMessage id="app.error.tryAgain" defaultMessage="Try again" />
                  </Button>
                </Box>
              </Box>
            </Card.Content>
          </Card>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: ''
    };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      // Raw exception text (when present) is inherently dynamic, unlocalizable content;
      // the empty-message fallback is rendered via a translated message instead, below.
      error: error.message || ''
    };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[GiftCraft] Dashboard error caught by boundary:', error, info);
    emitDiagnostic('dashboard_error', {
      outcome: 'failure',
      errorCode: 'REACT_ERROR_BOUNDARY',
      surface: 'dashboard'
    });
  }
  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: '' })} />;
    }
    return this.props.children;
  }
}
const INITIAL_OPTIONS: GiftOption[] = [{
  id: 'opt-classic',
  name: 'Classic Crimson Ribbon',
  wrapStyle: 'classic_ribbon',
  price: 4.99,
  characterLimit: 200,
  freeThreshold: 75.00,
  freeCardThreshold: 50.00,
  giftWithPurchase: {
    minSubtotal: 120.00,
    giftProductName: 'Handcrafted Wood Keepsake Tag'
  },
  enabled: true,
  taxable: true,
  createdAt: '2026-09-01'
}, {
  id: 'opt-luxury',
  name: 'Luxury Velvet & Gold Embossed',
  wrapStyle: 'luxury_gold',
  price: 9.99,
  characterLimit: 300,
  freeThreshold: 150.00,
  freeCardThreshold: 100.00,
  giftWithPurchase: {
    minSubtotal: 200.00,
    giftProductName: 'Artisan Scented Candle (Travel Size)'
  },
  enabled: true,
  taxable: true,
  createdAt: '2026-09-02'
}];
export function GiftCraftDashboard() {
  const intl = useIntl();
  const [options, setOptions] = useState<GiftOption[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [storageState, setStorageState] = useState<StorageSetupState | null>(null);
  const [storageErrorDetails, setStorageErrorDetails] = useState<string | undefined>(undefined);
  const [storageRequestId, setStorageRequestId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [entitlement, setEntitlement] = useState<AppEntitlement>({
    status: 'unavailable'
  });
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(true);
  const [instanceId, setInstanceId] = useState<string>('');
  const [ecommerceInstalled, setEcommerceInstalled] = useState<EcommerceInstallState>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<GiftOption | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isPaid = canUsePaidFeatures(entitlement);
  const upgradeUrl = getWixPricingPageUrl(APP_ID, instanceId);
  const refreshEntitlement = useCallback(async () => {
    try {
      const [result, nextEntitlement] = await Promise.all([appInstances.getAppInstance(), getAppEntitlement()]);
      const id = (result as any)?.instance?.instanceId || (result as any)?.site?.siteId || '';
      if (id) setInstanceId(id);
      setEcommerceInstalled(resolveEcommerceInstalled((result as any)?.site?.installedWixApps));
      setEntitlement(prev => {
        if (prev.status !== 'paid' && nextEntitlement.status === 'paid') {
          showAppToast(intl.formatMessage({ id: 'app.page.proPlanActiveToast', defaultMessage: 'Pro plan active - your GiftCraft upgrade is unlocked.' }), 'success');
        }
        return nextEntitlement;
      });
    } catch {
      setEntitlement({
        status: 'unavailable'
      });
    } finally {
      setIsEntitlementLoading(false);
    }
  }, [intl]);
  const checkStorage = useCallback(async (autoRetry = false) => {
    setBusy(true);
    const start = Date.now();
    try {
      const readiness = autoRetry ? await confirmStorageWithAutoRetry(() => assessConfigurationStorage()) : await assessConfigurationStorage();
      setStorageState(readiness.state);
      if (!readiness.ready) {
        setStorageReady(false);
        setStorageErrorDetails(readiness.details);
        setStorageRequestId(readiness.requestId);
        emitDiagnostic('storage_verification', {
          outcome: 'failure',
          durationMs: Date.now() - start,
          surface: 'dashboard',
          errorCode: readiness.state.toUpperCase(),
          wixRequestId: readiness.requestId
        });
        return;
      }
      const saved = await loadConfiguration<GiftOption>();
      setOptions(saved && saved.length > 0 ? saved : INITIAL_OPTIONS);
      setStorageReady(true);
      setStorageErrorDetails(undefined);
      setStorageRequestId(undefined);
      setStorageState('ready');
      markSetupFinished();
      emitDiagnostic('storage_verification', {
        outcome: 'success',
        durationMs: Date.now() - start,
        surface: 'dashboard'
      });
    } catch (error: any) {
      setStorageReady(false);
      setStorageState('error');
      setStorageErrorDetails(String(error?.message || error));
      setStorageRequestId(extractRequestId(error));
      emitDiagnostic('storage_verification', {
        outcome: 'failure',
        durationMs: Date.now() - start,
        surface: 'dashboard',
        errorCode: 'STORAGE_VERIFY_ERROR',
        wixRequestId: extractRequestId(error)
      });
    } finally {
      setBusy(false);
      setIsInitialLoad(false);
    }
  }, []);
  useEffect(() => {
    markDashboardLoaded();
    void checkStorage(false);
    void refreshEntitlement();
    void loadStoreCurrency().then(setCurrency);

    // A4: recognize an upgrade as soon as the merchant returns from the Wix pricing page,
    // without requiring a reinstall.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshEntitlement();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refreshEntitlement);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refreshEntitlement);
    };
  }, [checkStorage, refreshEntitlement]);
  const saveChanges = async () => {
    const start = Date.now();
    try {
      await saveConfiguration(options);
      showAppToast(intl.formatMessage({ id: 'app.page.configurationSavedToast', defaultMessage: 'Configuration saved.' }), 'success');
      emitDiagnostic('configuration_save', {
        outcome: 'success',
        durationMs: Date.now() - start,
        surface: 'dashboard'
      });
    } catch (error: any) {
      showAppToast(intl.formatMessage({ id: 'app.page.saveFailedToast', defaultMessage: 'Save failed: {error}' }, { error: String(error?.message || error) }), 'error');
      emitDiagnostic('configuration_save', {
        outcome: 'failure',
        durationMs: Date.now() - start,
        surface: 'dashboard',
        errorCode: 'CONFIGURATION_SAVE_FAILED'
      });
    }
  };
  const handleUpgrade = () => {
    if (!upgradeUrl) return;
    emitDiagnostic('upgrade_click', {
      outcome: 'success',
      surface: 'dashboard'
    });
    window.open(upgradeUrl, '_blank', 'noopener');
  };
  const [simItems, setSimItems] = useState<CheckoutLineItem[]>([{
    id: 'item-1',
    catalogItemId: 'prod-scarf',
    productName: 'Cashmere Winter Scarf',
    price: 48.00,
    quantity: 1
  }, {
    id: 'item-2',
    catalogItemId: 'prod-mug',
    productName: 'Ceramic Artisan Mug',
    price: 22.00,
    quantity: 1,
    tags: ['holiday-promo']
  }]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-classic');
  const [includeGreetingCard, setIncludeGreetingCard] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState('Happy Holidays and warm wishes for the new year!');
  const updateSimQuantity = (index: number, newQty: number) => {
    const updated = [...simItems];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(0, newQty)
    };
    setSimItems(updated.filter(it => it.quantity > 0));
  };
  const addSimItem = () => {
    setSimItems([...simItems, {
      id: `item-${Date.now()}`,
      catalogItemId: `prod-${Date.now()}`,
      productName: 'Handmade Aromatherapy Candle',
      price: 35.00,
      quantity: 1
    }]);
  };
  const toggleOptionActive = (id: string) => {
    const target = options.find(o => o.id === id);
    if (!target) return;
    const enabledCount = options.filter(o => o.enabled).length;
    if (!isPaid && !target.enabled && enabledCount >= FREE_PLAN_MAX_ENABLED_OPTIONS) {
      showAppToast(intl.formatMessage({ id: 'app.page.basicPlanLimitToast', defaultMessage: 'The Basic plan includes one active gift-wrap option. Upgrade to Pro to run more at once.' }), 'error');
      return;
    }
    setOptions(options.map(o => o.id === id ? {
      ...o,
      enabled: !o.enabled
    } : o));
  };
  const requestDeleteOption = (option: GiftOption) => setDeleteTarget(option);
  const confirmDeleteOption = (option: GiftOption) => {
    const remaining = options.filter(o => o.id !== option.id);
    setOptions(remaining);
    if (selectedOptionId === option.id && remaining.length > 0) setSelectedOptionId(remaining[0].id);
    setDeleteTarget(null);
    showAppToast(intl.formatMessage({ id: 'app.page.deletedOptionToast', defaultMessage: 'Deleted "{name}".' }, { name: option.name }), 'success');
  };
  const handleCreateOption = (option: GiftOption) => {
    setOptions([option, ...options]);
    setIsAddModalOpen(false);
    showAppToast(intl.formatMessage({ id: 'app.page.addedOptionToast', defaultMessage: 'Added "{name}". Click "Save configuration" to keep it.' }, { name: option.name }), 'success');
  };

  // A2/A12: the preview must reflect exactly what the paid-fee SPI would charge, so it
  // always evaluates against plan-restricted options rather than the raw saved list.
  const planLimitedOptions = restrictGiftOptionsForPlan(options, entitlement);
  const enabledOptions = planLimitedOptions.filter(o => o.enabled);
  const currentSelection: GiftSelection = {
    optionId: selectedOptionId,
    includeGreetingCard: isPaid && includeGreetingCard,
    greetingMessage
  };
  const simResult = evaluateGiftOptions({
    lineItems: simItems,
    selection: currentSelection,
    options: planLimitedOptions
  });
  const simSubtotal = calculateSubtotal(simItems);
  const activeCount = enabledOptions.length;
  const currentOption = planLimitedOptions.find(o => o.id === selectedOptionId);
  const charValidation = validateGreetingMessage(greetingMessage, currentOption?.characterLimit || 200);
  useEffect(() => {
    if (enabledOptions.length > 0 && !enabledOptions.some(o => o.id === selectedOptionId)) {
      setSelectedOptionId(enabledOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledOptions.map(o => o.id).join(',')]);
  return <>
    <Page height="100vh">
      <Page.Header title={intl.formatMessage({ id: 'app.page.title', defaultMessage: 'GiftCraft: Gift Wrapping & Greeting Cards' })} subtitle={intl.formatMessage({ id: 'app.page.subtitle', defaultMessage: 'Configure gift-wrap fees, an optional greeting card, and preview how they apply at checkout.' })} actionsBar={<Box gap="12px">
            <Button priority="secondary" disabled={!storageReady || busy} onClick={() => setIsAddModalOpen(true)}>
              <FormattedMessage id="app.page.addGiftOption" defaultMessage="+ Add gift option" />
            </Button>
            <Button priority="primary" disabled={!storageReady || busy} onClick={() => void saveChanges()}>
              <FormattedMessage id="app.page.saveConfiguration" defaultMessage="Save configuration" />
            </Button>
          </Box>} />

      <Page.Content>
        {isInitialLoad ? <Card>
            <Card.Content>
              <Box align="center" verticalAlign="middle" padding="40px">
                <Loader text={intl.formatMessage({ id: 'app.page.loadingConfiguration', defaultMessage: 'Loading your GiftCraft configuration...' })} />
              </Box>
            </Card.Content>
          </Card> : ecommerceInstalled === false ? <EmptyState theme="page" title={intl.formatMessage({ id: 'app.page.emptyStateTitle', defaultMessage: 'Add Wix Stores to use GiftCraft' })} subtitle={intl.formatMessage({ id: 'app.page.emptyStateSubtitle', defaultMessage: 'GiftCraft charges gift-wrap and greeting-card fees at checkout. Add Wix Stores (or another Wix eCommerce app) to this site, then return here to configure your options.' })}>
            <Button as="a" href={WIX_STORES_APP_MARKET_URL} target="_blank" rel="noopener noreferrer">
              <FormattedMessage id="app.page.addWixStores" defaultMessage="Add Wix Stores" />
            </Button>
          </EmptyState> : <Box direction="vertical" gap="16px">
            <StorageStatusCard storageReady={storageReady} storageState={storageState} storageErrorDetails={storageErrorDetails} storageRequestId={storageRequestId} busy={busy} onRetry={() => void checkStorage(storageState === 'provisioning' || storageState === 'timeout')} />

            <PlanStatusCard entitlement={entitlement} isEntitlementLoading={isEntitlementLoading} upgradeUrl={upgradeUrl} onUpgrade={handleUpgrade} />

            <Box gap="16px">
              <Box width="33%">
                <Card>
                  <Card.Content>
                    <Text secondary size="small"><FormattedMessage id="app.page.activeGiftOptions" defaultMessage="Active gift options" /></Text>
                    <Heading size="medium"><FormattedMessage id="app.page.activeOfTotal" defaultMessage="{active} of {total} active" values={{ active: activeCount, total: options.length }} /></Heading>
                    <Text size="tiny" secondary><FormattedMessage id="app.page.configurationPreviewOnly" defaultMessage="Configuration preview only" /></Text>
                  </Card.Content>
                </Card>
              </Box>
              <Box width="33%">
                <Card>
                  <Card.Content>
                    <Text secondary size="small"><FormattedMessage id="app.page.shopperSelection" defaultMessage="Shopper selection" /></Text>
                    <Heading size="medium"><FormattedMessage id="app.page.productModifier" defaultMessage="Product modifier" /></Heading>
                    <Text size="tiny" secondary><FormattedMessage id="app.page.requiresMerchantModifierSetup" defaultMessage="Requires merchant modifier setup" /></Text>
                  </Card.Content>
                </Card>
              </Box>
              <Box width="33%">
                <Card>
                  <Card.Content>
                    <Text secondary size="small"><FormattedMessage id="app.page.greetingCardsGwp" defaultMessage="Greeting cards & gift-with-purchase" /></Text>
                    <Heading size="medium">{isPaid ? <FormattedMessage id="app.page.proUnlocked" defaultMessage="Pro unlocked" /> : <FormattedMessage id="app.page.proOnly" defaultMessage="Pro only" />}</Heading>
                    <Text size="tiny" secondary><FormattedMessage id="app.page.notAddedToCheckout" defaultMessage="Not added to checkout or fulfillment" /></Text>
                  </Card.Content>
                </Card>
              </Box>
            </Box>

            <GiftOptionsTable options={options} isPaid={isPaid} busy={busy} currency={currency} onToggleOption={toggleOptionActive} onRequestDelete={requestDeleteOption} />

            <CheckoutPreviewCard isPaid={isPaid} simItems={simItems} onUpdateQuantity={updateSimQuantity} onAddItem={addSimItem} enabledOptions={enabledOptions} selectedOptionId={selectedOptionId} onSelectOption={setSelectedOptionId} includeGreetingCard={includeGreetingCard} onToggleGreetingCard={() => setIncludeGreetingCard(!includeGreetingCard)} greetingMessage={greetingMessage} onGreetingMessageChange={setGreetingMessage} currentOption={currentOption} charValidation={charValidation} currency={currency} simSubtotal={simSubtotal} simResult={simResult} />
          </Box>}
      </Page.Content>
    </Page>

    {/* Page only recognizes Page.Header/Page.Content/Page.Tail children and silently drops
        anything else, so these modals must render as Page's siblings, not its children. */}
    <AddGiftOptionModal isOpen={isAddModalOpen} isPaid={isPaid} onClose={() => setIsAddModalOpen(false)} onCreate={handleCreateOption} />

    <DeleteConfirmModal option={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDeleteOption} />
  </>;
}
function GiftCraftDashboardRoot() {
  return <ErrorBoundary>
      <WixDesignSystemProvider>
        <GiftCraftDashboard />
      </WixDesignSystemProvider>
    </ErrorBoundary>;
}
export default withIntlProvider(GiftCraftDashboardRoot);
