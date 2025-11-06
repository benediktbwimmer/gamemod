import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { ThemeConfig } from "@/lib/theme";
import type { StaffSiteSettings } from "@/lib/staffSettings";

type StaffSettingsResponse = {
  theme: ThemeConfig;
  site: StaffSiteSettings;
};

type StaffSettingsPayload = Partial<StaffSettingsResponse>;

export function useStaffSettingsQuery() {
  return useQuery({
    queryKey: ["staff-settings"],
    queryFn: (): Promise<StaffSettingsResponse> =>
      apiFetch<StaffSettingsResponse>("/v1/staff/settings"),
    staleTime: 0
  });
}

export function useStaffSettingsMutation(adminKey: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StaffSettingsPayload): Promise<StaffSettingsResponse> => {
      if (!adminKey) {
        return Promise.reject(new Error("Staff credentials required to update settings."));
      }

      return apiFetch<StaffSettingsResponse>("/v1/staff/settings", {
        method: "PUT",
        headers: {
          "x-admin-key": adminKey
        },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["staff-settings"], data);
    }
  });
}
