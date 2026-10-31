"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { type AdminCard, type BoardColumn, fetchBoard, moveOrder } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { formatNaira } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders/types";

const placed = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" });
const KEY = ["admin-board"];

function moveLocally(columns: BoardColumn[], id: string, to: OrderStatus): BoardColumn[] {
  const card = columns.flatMap((c) => c.orders).find((o) => o.id === id);
  if (!card) return columns;
  return columns.map((c) => {
    if (c.status === card.status) {
      return { ...c, count: c.count - 1, orders: c.orders.filter((o) => o.id !== id) };
    }
    if (c.status === to) return { ...c, count: c.count + 1, orders: [{ ...card, status: to }, ...c.orders] };
    return c;
  });
}

function Card({
  card,
  columns,
  onMove,
}: {
  card: AdminCard;
  columns: BoardColumn[];
  onMove: (id: string, to: OrderStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const moveId = useId();
  // `relative` keeps the sr-only label inside the scrolling board.
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3 ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/orders/${card.id}`} className="text-sm font-semibold text-zinc-50 hover:underline">
          {card.order_number}
        </Link>
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Drag ${card.order_number}`}
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900"
        >
          <span aria-hidden>⠿</span>
        </button>
      </div>
      <p className="text-sm text-zinc-300">{card.customer}</p>
      <p className="text-xs text-zinc-400">
        {placed.format(new Date(card.created_at))} · {card.item_count} {card.item_count === 1 ? "item" : "items"} ·{" "}
        {formatNaira(card.total)}
        {card.has_custom ? <span className="ml-2 rounded-full bg-amber-400 px-2 text-black">Custom</span> : null}
      </p>
      <label htmlFor={moveId} className="sr-only">
        Move {card.order_number} to
      </label>
      <select
        id={moveId}
        value={card.status}
        onChange={(e) => onMove(card.id, e.target.value as OrderStatus)}
        className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
      >
        {columns.map((c) => (
          <option key={c.status} value={c.status}>
            {c.label}
          </option>
        ))}
      </select>
    </li>
  );
}

function Column({
  column,
  columns,
  onMove,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  onMove: (id: string, to: OrderStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const headingId = useId();
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={`flex w-72 shrink-0 snap-start flex-col gap-3 rounded-lg border p-3 ${isOver ? "border-amber-400" : "border-zinc-800"}`}
    >
      <h2 id={headingId} className="flex items-center justify-between text-sm font-semibold text-zinc-50">
        {column.label}
        <span className="text-xs text-zinc-400">{column.count}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {column.orders.map((card) => (
          <Card key={card.id} card={card} columns={columns} onMove={onMove} />
        ))}
      </ul>
      {column.count > column.orders.length ? (
        <p className="text-xs text-zinc-500">Showing the newest {column.orders.length}.</p>
      ) : null}
    </section>
  );
}

// FR-ADM-02: drag a card (or pick a column) to change its status.
export function OrderBoard() {
  const queryClient = useQueryClient();
  const board = useQuery({ queryKey: KEY, queryFn: fetchBoard });
  const [errors, setErrors] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: OrderStatus }) => moveOrder(id, to),
    meta: {
      success: (_card: unknown, { to }: { to: OrderStatus }) =>
        `Order moved to ${board.data?.columns.find((c) => c.status === to)?.label ?? to}.`,
      label: "Moved",
    },
    onMutate: ({ id, to }) => {
      setErrors([]);
      const before = queryClient.getQueryData<{ columns: BoardColumn[] }>(KEY);
      if (before) queryClient.setQueryData(KEY, { columns: moveLocally(before.columns, id, to) });
      return { before };
    },
    onError: (error, _vars, context) => {
      if (context?.before) queryClient.setQueryData(KEY, context.before);
      setErrors(errorMessages(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  if (board.isError) return <p className="px-4 text-zinc-400">The board could not load. Refresh to try again.</p>;
  if (!board.data) return <p className="px-4 text-zinc-400">Loading orders…</p>;
  const columns = board.data.columns;
  const onMove = (id: string, to: OrderStatus) => {
    const card = columns.flatMap((c) => c.orders).find((o) => o.id === id);
    if (card && card.status !== to) move.mutate({ id, to });
  };
  const onDragEnd = (event: DragEndEvent) => {
    if (event.over) onMove(String(event.active.id), event.over.id as OrderStatus);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {errors.length ? (
        <p role="alert" className="px-4 text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4">
          {columns.map((column) => (
            <Column key={column.status} column={column} columns={columns} onMove={onMove} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
