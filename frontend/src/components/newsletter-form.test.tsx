import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsletterForm } from "./newsletter-form";
import { UnsubscribeButton } from "./unsubscribe-button";

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("NewsletterForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("subscribes without the session cookie and confirms", async () => {
    const fetchMock = respond(200, { detail: "You're on the list." });
    render(<NewsletterForm />);
    const input = screen.getByLabelText("Get new drops by email");
    await userEvent.type(input, "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByText(/You're on the list. New drops land in your inbox every week./)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/newsletter/subscribe/");
    expect(JSON.parse(init.body)).toEqual({ email: "ada@example.com" });
    expect(init.credentials).toBeUndefined();
    expect(input).toHaveValue("");
  });

  it("shows the server's reason, and a clear message when throttled", async () => {
    respond(400, { email: ["Enter a valid email address."] });
    render(<NewsletterForm />);
    await userEvent.type(screen.getByLabelText("Get new drops by email"), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
    respond(429, { detail: "Request was throttled." });
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Wait a minute and try again.");
  });
});

describe("UnsubscribeButton", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("unsubscribes only when the button is pressed", async () => {
    const fetchMock = respond(200, { detail: "You've been unsubscribed." });
    render(<UnsubscribeButton token="tok" />);
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    expect(await screen.findByRole("status")).toHaveTextContent("You've been unsubscribed. You won't get new-drop emails any more.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: "tok" });
  });

  it("explains a bad link", async () => {
    respond(400, { detail: "This unsubscribe link isn't valid." });
    render(<UnsubscribeButton token="bad" />);
    await userEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't valid");
  });
});
