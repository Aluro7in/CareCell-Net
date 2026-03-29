import { useQueryClient } from "@tanstack/react-query";
import { 
  useListRequests, 
  useCreateRequest, 
  useUpdateRequestStatus,
  useListAlerts,
  getListRequestsQueryKey,
  getListAlertsQueryKey
} from "@workspace/api-client-react";
import type { RequestStatus } from "@workspace/api-client-react";

export function useEmergencyRequests(polling = false) {
  return useListRequests({
    query: {
      refetchInterval: polling ? 5000 : false
    }
  });
}

export function useCreateEmergencyRequest() {
  const queryClient = useQueryClient();
  const mutation = useCreateRequest();
  
  return {
    ...mutation,
    mutateAsync: async (data: any, options?: any) => {
      const result = await mutation.mutateAsync(data, options);
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      return result;
    }
  };
}

export function useChangeRequestStatus() {
  const queryClient = useQueryClient();
  const mutation = useUpdateRequestStatus();

  return {
    ...mutation,
    mutateAsync: async ({ id, status }: { id: number, status: RequestStatus }) => {
      const result = await mutation.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
      return result;
    }
  };
}

export function useAlerts(polling = false) {
  return useListAlerts({
    query: {
      refetchInterval: polling ? 5000 : false
    }
  });
}
