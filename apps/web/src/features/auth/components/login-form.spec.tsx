// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { autofill as fill, mimicBrowserFormData } from "@/shared/testing/dom";

import type { AuthResult } from "../types";

const login = vi.fn<(input: unknown) => Promise<AuthResult>>();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  unstable_isUnrecognizedActionError: () => false,
}));
vi.mock("../actions/login", () => ({ login: (input: unknown) => login(input) }));

const { LoginForm } = await import("./login-form");

mimicBrowserFormData();

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  login.mockReset();
  replace.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LoginForm next="/tai-khoan" googleEnabled={false} turnstileSiteKey={null} urlError={null} />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const field = (name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const form = () => container.querySelector("form")!;
const text = () => container.textContent ?? "";

const autofill = (name: string, value: string) => fill(field(name), value);

async function submit() {
  await act(async () => {
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  });
}

describe("LoginForm with browser autofill", () => {
  it("sends the autofilled values read from the form, not from React state", async () => {
    login.mockResolvedValue({ status: "ok" });
    autofill("email", "an@lavieco.test");
    autofill("password", "mat-khau-tu-dien");
    await submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(login.mock.calls[0]?.[0]).toMatchObject({
      email: "an@lavieco.test",
      password: "mat-khau-tu-dien",
    });
    expect(replace).toHaveBeenCalledWith("/tai-khoan");
  });

  // The bug: while the action ran, the disabled inputs fell out of FormData and a blur
  // re-check reported both fields as missing, in Zod's raw English, next to the
  // server's "wrong email or password".
  it("shows only the server's answer: no field errors from a re-check while sending", async () => {
    let answer: (result: AuthResult) => void = () => undefined;
    login.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    autofill("email", "an@lavieco.test");
    autofill("password", "sai-mat-khau");
    await submit();
    await act(async () => {
      form().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      form().dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => answer({ status: "error", reason: "invalid_credentials" }));
    expect(text()).toContain("Email hoặc mật khẩu chưa đúng.");
    expect(text()).not.toMatch(/Invalid input|expected string|received undefined/);
    expect(text()).not.toContain("mục cần điền");
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it("does not call the action when the client check fails, and says why in Vietnamese", async () => {
    autofill("email", "ban@");
    await submit();
    expect(login).not.toHaveBeenCalled();
    expect(text()).toContain("Email chưa đúng định dạng");
    expect(text()).toContain("Bạn vui lòng nhập mật khẩu.");
    expect(text()).toContain("Còn 2 mục cần điền hoặc sửa");
    expect(text()).not.toMatch(/Invalid|expected|received/);
  });

  it("clears the previous server answer when sending again", async () => {
    login.mockResolvedValueOnce({ status: "error", reason: "invalid_credentials" });
    autofill("email", "an@lavieco.test");
    autofill("password", "sai-mat-khau");
    await submit();
    expect(text()).toContain("Email hoặc mật khẩu chưa đúng.");
    let answer: (result: AuthResult) => void = () => undefined;
    login.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await submit();
    expect(text()).not.toContain("Email hoặc mật khẩu chưa đúng.");
    await act(async () => answer({ status: "ok" }));
  });
});
