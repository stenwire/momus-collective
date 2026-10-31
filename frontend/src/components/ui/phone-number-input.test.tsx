import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { PhoneNumberInput } from "./phone-number-input";

function ControlledPhone() {
  const [phone, setPhone] = useState("+234");
  return <PhoneNumberInput label="Phone" name="phone" value={phone} onChange={setPhone} />;
}

describe("PhoneNumberInput", () => {
  it("defaults to Nigeria and strips non-numeric characters", async () => {
    render(<ControlledPhone />);
    const user = userEvent.setup();
    const national = screen.getByLabelText("Phone");
    expect(screen.getByRole("combobox", { name: "Country calling code" })).toHaveValue("NG");
    await user.type(national, "0800abc-123");
    expect(national).toHaveValue("800123");
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')).toHaveValue("+234800123");
  });

  it("changes calling code without accepting punctuation in the number", async () => {
    render(<ControlledPhone />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Country calling code" }), "US");
    await user.type(screen.getByLabelText("Phone"), "555 1234");
    expect(screen.getByRole("combobox", { name: "Country calling code" })).toHaveValue("US");
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')).toHaveValue("+15551234");
  });
});
