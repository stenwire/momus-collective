import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreateAccountOffer } from "./create-account-offer";

describe("CreateAccountOffer", () => {
  it("links to registration with the guest's details filled in", () => {
    render(
      <CreateAccountOffer
        details={{ email: "g@example.com", first_name: "Ada", last_name: "L", phone: "+2348000000000" }}
      />,
    );
    const href = screen.getByRole("link", { name: "Create my account" }).getAttribute("href")!;
    const params = new URL(href, "http://x").searchParams;
    expect(new URL(href, "http://x").pathname).toBe("/register");
    expect(Object.fromEntries(params)).toMatchObject({
      email: "g@example.com",
      first_name: "Ada",
      last_name: "L",
      phone: "+2348000000000",
    });
  });
});
