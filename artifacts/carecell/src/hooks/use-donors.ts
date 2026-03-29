import { useQueryClient } from "@tanstack/react-query";
import { 
  useListDonors, 
  useCreateDonor, 
  useUpdateDonorAvailability,
  getListDonorsQueryKey
} from "@workspace/api-client-react";

export function useDonors() {
  return useListDonors();
}

export function useRegisterDonor() {
  const queryClient = useQueryClient();
  const mutation = useCreateDonor();
  
  return {
    ...mutation,
    mutateAsync: async (data: any, options?: any) => {
      const result = await mutation.mutateAsync(data, options);
      queryClient.invalidateQueries({ queryKey: getListDonorsQueryKey() });
      return result;
    }
  };
}

export function useToggleDonorAvailability() {
  const queryClient = useQueryClient();
  const mutation = useUpdateDonorAvailability();

  return {
    ...mutation,
    mutateAsync: async ({ id, available }: { id: number, available: boolean }) => {
      const result = await mutation.mutateAsync({ id, data: { available } });
      queryClient.invalidateQueries({ queryKey: getListDonorsQueryKey() });
      return result;
    }
  };
}
