import type {
  CreateImIntegrationRequest,
  ImIntegration,
  ImIntegrationPlatform,
  UpdateImIntegrationRequest,
} from "@/fetchers/im-integration/im-integration-client";

type ImWebhookMutation<TVariables> = {
  mutateAsync: (variables: TVariables) => Promise<unknown>;
  isPending: boolean;
};

export type ImWebhookProvider = {
  platform: ImIntegrationPlatform;
  name: string;
  nameKey: string;
  webhookUrlPattern: RegExp;
  keys: {
    webhookPlaceholder: string;
    webhookHint: string;
    webhookInvalid: string;
    secretLabel: string;
    secretPlaceholder: string;
    secretHint: string;
    secretHintConfigured: string;
    connect: string;
    saved: string;
    saveError: string;
    enabled: string;
    disabled: string;
    updateError: string;
    removed: string;
    removeError: string;
  };
  useIntegration: (projectId: string) => {
    data: ImIntegration | undefined;
    isLoading: boolean;
  };
  useCreateIntegration: () => ImWebhookMutation<{
    projectId: string;
    data: CreateImIntegrationRequest;
  }>;
  useUpdateIntegration: () => ImWebhookMutation<{
    projectId: string;
    json: UpdateImIntegrationRequest;
  }>;
  useDeleteIntegration: () => ImWebhookMutation<string>;
};
