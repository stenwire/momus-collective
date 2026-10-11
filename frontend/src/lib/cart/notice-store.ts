import { create } from "zustand";

export type DroppedLine = { title: string; reason: string };

type NoticeState = {
  dropped: DroppedLine[];
  setDropped: (dropped: DroppedLine[]) => void;
};

export const useCartNotice = create<NoticeState>()((set) => ({
  dropped: [],
  setDropped: (dropped) => set({ dropped }),
}));
