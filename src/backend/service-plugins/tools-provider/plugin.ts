import { toolsProvider } from '@wix/app-tools/service-plugins';
import { canUsePaidFeatures, getAppEntitlement } from '../../../shared/entitlement';
import { loadConfiguration, verifyConfigurationStorage } from '../../../shared/configuration';

toolsProvider.provideHandlers({
  runTool: async ({ request }) => {
    switch (request.methodName) {
      case 'get-entitlement': {
        // App Tools runs with no merchant session, so the entitlement check must
        // use the app's own identity (see shared/entitlement.ts).
        const entitlement = await getAppEntitlement({ elevated: true });
        return { response: { status: entitlement.status, isPaid: canUsePaidFeatures(entitlement) } };
      }
      case 'verify-storage': {
        return { response: { ready: await verifyConfigurationStorage({ elevated: true }) } };
      }
      case 'describe-config': {
        if (!(await verifyConfigurationStorage({ elevated: true }))) return { response: { ready: false, count: 0 } };
        return { response: { ready: true, count: (await loadConfiguration({ elevated: true })).length } };
      }
      default:
        throw new Error(`Unknown tool: ${request.methodName}`);
    }
  },
});
