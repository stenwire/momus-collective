import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/auth/api";
import { makeQueryClient } from "./query-client";
import { useToasts } from "./toast";

const toasts = () => useToasts.getState().toasts;

describe("makeQueryClient", () => {
  beforeEach(() => useToasts.setState({ toasts: [] }));

  it("announces a successful write with the message its mutation names", async () => {
    const client = makeQueryClient();
    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => ({ name: "Tees" }), meta: { success: (d: { name: string }) => `${d.name} saved.`, label: "Saved" } })
      .execute(undefined);
    expect(toasts()).toMatchObject([{ message: "Tees saved.", tone: "success", label: "Saved" }]);
  });

  it("says nothing on success when the mutation names no message", async () => {
    const client = makeQueryClient();
    await client.getMutationCache().build(client, { mutationFn: async () => 1 }).execute(undefined);
    expect(toasts()).toHaveLength(0);
  });

  it("reports any failure, unless the mutation reports it itself", async () => {
    const client = makeQueryClient();
    const fail = async () => {
      throw new ApiError(400, { detail: "Slug taken." });
    };
    await client.getMutationCache().build(client, { mutationFn: fail }).execute(undefined).catch(() => {});
    await client.getMutationCache().build(client, { mutationFn: fail, meta: { quiet: true } }).execute(undefined).catch(() => {});
    expect(toasts()).toMatchObject([{ message: "Slug taken.", tone: "error", label: "Failed" }]);
  });
});
