import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComplaintForm } from "./complaint-form";

const response = {
  ok: true,
  status: 201,
  json: async () => ({ reference: "AB12CD34" }),
} as Response;

describe("ComplaintForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("submits complaint details and shows a reference", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    render(<ComplaintForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email address"), "customer@example.com");
    await user.type(screen.getByLabelText("Order number (optional)"), "MOM-123");
    await user.selectOptions(screen.getByLabelText("What is this about?"), "delivery");
    await user.type(screen.getByLabelText("Tell us what happened"), "My delivery has not arrived.");
    await user.click(screen.getByRole("button", { name: "Send complaint" }));

    expect(await screen.findByRole("status")).toHaveTextContent("AB12CD34");
    const [, request] = fetchMock.mock.calls[0];
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body as string)).toMatchObject({
      email: "customer@example.com",
      order_number: "MOM-123",
      topic: "delivery",
      details: "My delivery has not arrived.",
      website: "",
    });
  });
});
