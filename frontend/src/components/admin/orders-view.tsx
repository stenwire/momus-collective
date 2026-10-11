"use client";

import { useState } from "react";
import { OrderBoard } from "./order-board";
import { OrderList } from "./order-list";

const VIEWS = [
  { key: "board", label: "Board" },
  { key: "list", label: "List" },
] as const;

export function OrdersView() {
  const [view, setView] = useState<"board" | "list">("board");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="group" aria-label="View" className="flex gap-2 px-4">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            aria-pressed={view === v.key}
            onClick={() => setView(v.key)}
            className={`min-h-11 rounded-md border px-4 text-sm ${
              view === v.key ? "border-amber-400 text-zinc-50" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "board" ? <OrderBoard /> : <OrderList />}
    </div>
  );
}
