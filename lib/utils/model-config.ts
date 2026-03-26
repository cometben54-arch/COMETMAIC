import { useSettingsStore } from '@/lib/store/settings';

/**
 * Get current model configuration from settings store.
 *
 * Includes a `isReady` flag indicating whether the provider + model
 * selection looks usable (has an API key, is server-configured, or
 * doesn't require one). Callers can use this to show early warnings
 * instead of waiting for a 401 from the backend.
 */
export function getCurrentModelConfig() {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  const modelString = `${providerId}:${modelId}`;

  // Get current provider's config
  const providerConfig = providersConfig[providerId];

  const hasApiKey = !!providerConfig?.apiKey;
  const isServerConfigured = !!providerConfig?.isServerConfigured;
  const requiresApiKey = providerConfig?.requiresApiKey ?? true;

  // Provider is ready if: has a client key, or server has one, or key isn't needed
  const isReady =
    !!providerId && !!modelId && (hasApiKey || isServerConfigured || !requiresApiKey);

  return {
    providerId,
    modelId,
    modelString,
    apiKey: providerConfig?.apiKey || '',
    baseUrl: providerConfig?.baseUrl || '',
    providerType: providerConfig?.type,
    requiresApiKey,
    isServerConfigured,
    isReady,
  };
}
