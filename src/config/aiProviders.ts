/**
 * AI Model Provider Configuration
 *
 * Central registry for LLM providers used by the application.
 * Extend this file when adding new providers or models.
 */

export interface AIModel {
  id: string;
  name: string;
  /** Optional: override the provider's default base URL for this specific model */
  baseUrl?: string;
}

export interface AIProvider {
  id: string;
  displayName: string;
  baseUrl: string;
  /** API key env var name (e.g., 'VITE_META_MODEL_API_KEY') — never hardcode keys */
  apiKeyEnvVar?: string;
  models: AIModel[];
  /** Default model ID to use when none specified */
  defaultModelId: string;
}

export const aiProviders: Record<string, AIProvider> = {
  meta: {
    id: 'meta',
    displayName: 'Meta Model API',
    baseUrl: 'https://api.meta.ai/v1',
    apiKeyEnvVar: 'VITE_META_MODEL_API_KEY',
    models: [
      {
        id: 'muse-spark-1.3',
        name: 'Muse Spark 1.3',
      },
    ],
    defaultModelId: 'muse-spark-1.3',
  },
};

/** Get a provider by its ID */
export function getProvider(id: string): AIProvider | undefined {
  return aiProviders[id];
}

/** Get a model by provider ID and model ID */
export function getModel(providerId: string, modelId: string): AIModel | undefined {
  const provider = aiProviders[providerId];
  return provider?.models.find((m) => m.id === modelId);
}

/** Get the default model for a provider */
export function getDefaultModel(providerId: string): AIModel | undefined {
  const provider = aiProviders[providerId];
  if (!provider) return undefined;
  return provider.models.find((m) => m.id === provider.defaultModelId);
}

/** List all available providers */
export function listProviders(): AIProvider[] {
  return Object.values(aiProviders);
}