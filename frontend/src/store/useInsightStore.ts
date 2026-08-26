import { create } from "zustand";

export type InsightPayload = {
  title: string;
  summary: string;
  detail: string;
};

type InsightState = InsightPayload & {
  open: boolean;
  show: (payload: InsightPayload) => void;
  hide: () => void;
};

export const useInsightStore = create<InsightState>((set) => ({
  open: false,
  title: "",
  summary: "",
  detail: "",
  show: (payload) => set({ open: true, ...payload }),
  hide: () => set({ open: false }),
}));
