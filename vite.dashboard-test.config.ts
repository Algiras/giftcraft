import { defineConfig, type Plugin } from 'vite';

const virtual = (name: string) => `\0giftcraft-dashboard-test:${name}`;

function wixServiceMocks(): Plugin {
  const pageImports: Record<string, string> = {
    '../../shared/configuration': 'configuration',
    '../../shared/logger': 'logger',
  };

  const mocks: Record<string, string> = {
    'business-tools': `
      export const siteProperties = {
        getSiteProperties: () => Promise.resolve({
          properties: {
            paymentCurrency: new URLSearchParams(window.location.search).get('currency') || 'USD',
          },
        }),
      };
    `,
    'app-management': `
      export const billing = {};
      export const biEvents = { sendBiEvent: () => Promise.resolve() };
      export const appInstances = {
        getAppInstance: () => {
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const isFree = params ? params.get('plan') === 'free' : false;
          return Promise.resolve({
            site: { siteId: '4f9c31b9-ddcf-4ae7-bd8e-d09d38e7694f' },
            instance: { instanceId: '4f9c31b9-ddcf-4ae7-bd8e-d09d38e7694f', isFree },
          });
        }
      };
    `,
    essentials: `
      function currentLang() {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        return (params && params.get('lang')) || 'en';
      }
      export const i18n = {
        getLanguage: () => currentLang(),
        getLocale: () => currentLang(),
      };
    `,
    logger: `
      export const emitDiagnostic = () => {};
      export const markSetupFinished = () => {};
      export const markDashboardLoaded = () => {};
      export const logger = {
        time: async (_action, fn) => fn(),
        info: () => {},
        warn: () => {},
        error: () => {},
        trackUsage: () => {},
      };
    `,
    configuration: `
      export const COLLECTION_ID = '@krasalgim/giftcraft/giftcraft-options';
      let mockOptions = [
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
        }
      ];

      export const verifyConfigurationStorage = async () => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (params && params.get('storage') === 'unverified') return false;
        return true;
      };

      export const assessConfigurationStorage = async () => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (params && params.get('storage') === 'unverified') {
          return { ready: false, state: 'error', message: '', details: undefined, requestId: undefined };
        }
        return { ready: true, state: 'ready', message: '' };
      };

      export const loadConfiguration = async () => [...mockOptions];

      export const saveConfiguration = async (entries) => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (params && params.get('save') === 'error') throw new Error('Mock save failure');
        mockOptions = [...entries];
      };

      export const initializeConfiguration = async () => {
        return;
      };
    `,
  };

  return {
    name: 'giftcraft-dashboard-wix-service-mocks',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '@wix/app-management') return virtual('app-management');
      if (source === '@wix/business-tools') return virtual('business-tools');
      if (source === '@wix/essentials') return virtual('essentials');
      if (!importer?.endsWith('/src/dashboard/pages/page.tsx')) return null;
      const mock = pageImports[source];
      return mock ? virtual(mock) : null;
    },
    load(id) {
      const mock = id.replace('\0giftcraft-dashboard-test:', '');
      return mocks[mock];
    },
  };
}

export default defineConfig({
  plugins: [wixServiceMocks()],
});
