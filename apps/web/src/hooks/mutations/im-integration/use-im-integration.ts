import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CreateImIntegrationRequest,
  createImIntegration,
  deleteImIntegration,
  type ImIntegrationPlatform,
  type UpdateImIntegrationRequest,
  updateImIntegration,
} from "@/fetchers/im-integration/im-integration-client";

export function useCreateImIntegration(platform: ImIntegrationPlatform) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateImIntegrationRequest;
    }) => createImIntegration(platform, projectId, data),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: [`${platform}-integration`, projectId],
      });
    },
  });
}

export function useUpdateImIntegration(platform: ImIntegrationPlatform) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      json,
    }: {
      projectId: string;
      json: UpdateImIntegrationRequest;
    }) => updateImIntegration(platform, projectId, json),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: [`${platform}-integration`, projectId],
      });
    },
  });
}

export function useDeleteImIntegration(platform: ImIntegrationPlatform) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteImIntegration(platform, projectId),
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: [`${platform}-integration`, projectId],
      });
    },
  });
}
