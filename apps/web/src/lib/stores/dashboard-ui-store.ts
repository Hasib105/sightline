import { create } from "zustand";

type DashboardUiState = {
  selectedPlaygroundApiKeyId: number | null;
  playgroundAsyncMode: boolean;
  logsCategory: string;
  includeAllUsersLogs: boolean;
  setSelectedPlaygroundApiKeyId: (value: number | null) => void;
  setPlaygroundAsyncMode: (value: boolean) => void;
  setLogsCategory: (value: string) => void;
  setIncludeAllUsersLogs: (value: boolean) => void;
};

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  selectedPlaygroundApiKeyId: null,
  playgroundAsyncMode: false,
  logsCategory: "",
  includeAllUsersLogs: false,
  setSelectedPlaygroundApiKeyId: (value) => set({ selectedPlaygroundApiKeyId: value }),
  setPlaygroundAsyncMode: (value) => set({ playgroundAsyncMode: value }),
  setLogsCategory: (value) => set({ logsCategory: value }),
  setIncludeAllUsersLogs: (value) => set({ includeAllUsersLogs: value }),
}));
