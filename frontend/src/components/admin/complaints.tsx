"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { errorMessages } from "@/lib/auth/api";
import { LoadMore } from "@/components/ui/load-more";
import { fetchAdminComplaints, nextPageParam, updateComplaintStatus } from "@/lib/admin/api";

const KEY = ["admin-complaints"];
const date = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export function AdminComplaints() {
  const queryClient = useQueryClient();
  const complaints = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchAdminComplaints(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const rows = complaints.data?.pages.flatMap((page) => page.results) ?? [];
  const [error, setError] = useState("");
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "resolved" }) => updateComplaintStatus(id, status),
    meta: {
      success: (_data: unknown, { status }: { id: string; status: "open" | "resolved" }) => (status === "resolved" ? "Complaint resolved." : "Complaint reopened."),
      label: "Updated",
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    onError: (reason) => setError(errorMessages(reason).join(" ")),
  });

  if (complaints.isError) return <p role="alert" className="text-error">Complaints could not load. Refresh to try again.</p>;
  if (!complaints.data) return <p role="status" className="text-sm text-bone-muted">Loading complaints…</p>;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p aria-live="polite" className="text-sm text-error">{error}</p>
      {rows.length === 0 ? (
        <EmptyState title="No open issues">Customer complaints will appear here when they’re filed.</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {rows.map((complaint) => (
            <li key={complaint.id} className="grid min-w-0 gap-3 border-b border-rule py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="font-semibold text-bone">{complaint.topic_label}</h2>
                  <span className={`font-mono text-xs ${complaint.status === "open" ? "text-laurel" : "text-ok"}`}>{complaint.status_label}</span>
                  <time className="text-xs text-bone-muted" dateTime={complaint.created_at}>{date.format(new Date(complaint.created_at))}</time>
                </div>
                <p className="text-sm text-bone-muted">
                  <a href={`mailto:${complaint.email}`} className="text-laurel underline">{complaint.email}</a>
                  {complaint.order_number ? ` · ${complaint.order_number}` : ""}
                </p>
                <p className="whitespace-pre-line break-words text-sm text-bone">{complaint.details}</p>
              </div>
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => {
                  setError("");
                  update.mutate({ id: complaint.id, status: complaint.status === "open" ? "resolved" : "open" });
                }}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                {complaint.status === "open" ? <Check className="size-4" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
                {complaint.status === "open" ? "Mark resolved" : "Reopen"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <LoadMore hasNext={Boolean(complaints.hasNextPage)} loading={complaints.isFetchingNextPage} onClick={() => complaints.fetchNextPage()} />
    </div>
  );
}