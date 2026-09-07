import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgId } from "@/hooks/useOrgId";
import { callUntypedRpc } from "@/lib/supabaseRpc";

export type SalarySetting = {
  id: string;
  organization_id: string;
  setting_key: string;
  setting_value: number;
  description: string;
  created_at: string;
  updated_at: string;
};

export const useSalarySettings = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["salary-settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<SalarySetting[]>(
        "get_organization_salary_settings",
        { _org_id: orgId },
      );
      if (error) throw error;
      return data ?? [];
    },
  });
  const update = useMutation({
    mutationFn: async ({
      id,
      setting_value,
    }: {
      id: string;
      setting_value: string;
    }) => {
      const parsedValue = Number(setting_value);
      if (!Number.isFinite(parsedValue) || parsedValue < 0)
        throw new Error("قيمة إعداد الراتب غير صالحة");
      const { data, error } = await callUntypedRpc<SalarySetting>(
        "update_organization_salary_setting",
        { _setting_id: id, _setting_value: parsedValue },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["salary-settings", orgId] }),
  });
  return {
    salarySettings: settings.data ?? [],
    settingsLoading: settings.isLoading,
    updateSalarySetting: update.mutateAsync,
    isUpdatingSetting: update.isPending,
    getSetting: (key: string) =>
      settings.data
        ?.find((setting) => setting.setting_key === key)
        ?.setting_value.toString(),
  };
};
