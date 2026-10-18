import { useQuery } from "@tanstack/react-query";
import {
  getImIntegration,
  type ImIntegrationPlatform,
} from "@/fetchers/im-integration/im-integration-client";

export function useGetImIntegration(
  platform: ImIntegrationPlatform,
  projectId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [`${platform}-integration`, projectId],
    queryFn: () => getImIntegration(platform, projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export function useGetFeishuIntegration(
  projectId: string,
  options?: { enabled?: boolean },
) {
  return useGetImIntegration("feishu", projectId, options);
}

export function useGetLarkIntegration(
  projectId: string,
  options?: { enabled?: boolean },
) {
  return useGetImIntegration("lark", projectId, options);
}

export function useGetDingtalkIntegration(
  projectId: string,
  options?: { enabled?: boolean },
) {
  return useGetImIntegration("dingtalk", projectId, options);
}

export default useGetImIntegration;
