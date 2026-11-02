import { describe, expect, it } from "vitest";

import type { SurveyQuestion } from "@lavieco/shared/events";

import {
  answersToSend,
  draftKey,
  missingRequired,
  parseDraft,
  progressOf,
  respondentId,
} from "./answers";

const question = (id: string, overrides: Partial<SurveyQuestion> = {}): SurveyQuestion => ({
  id,
  type: "short_text",
  label: id,
  description: "",
  required: false,
  options: [],
  scaleLow: "",
  scaleHigh: "",
  ...overrides,
});

const QUESTIONS = [
  question("s", { type: "section" }),
  question("a", { required: true, type: "rating" }),
  question("b"),
  question("c", { required: true, type: "multiple_choice" }),
];

describe("survey answers", () => {
  it("does not count sections, and counts a 0 on the scale as answered", () => {
    expect(progressOf(QUESTIONS, {})).toMatchObject({ done: 0, total: 3 });
    expect(progressOf(QUESTIONS, { a: 0, b: " x", c: [] })).toMatchObject({ done: 2, total: 3 });
  });

  it("lists missing required questions in order", () => {
    expect(missingRequired(QUESTIONS, {})).toEqual(["a", "c"]);
    expect(missingRequired(QUESTIONS, { a: 5, c: ["x"] })).toEqual([]);
    expect(missingRequired(QUESTIONS, { a: 0 })).toEqual(["c"]);
  });

  it("sends only real answers to questions that still exist", () => {
    expect(answersToSend(QUESTIONS, { a: 4, b: "", c: [], gone: "x" })).toEqual({ a: 4 });
  });

  it("reads a draft defensively", () => {
    expect(parseDraft(null)).toEqual({});
    expect(parseDraft("không phải json")).toEqual({});
    expect(parseDraft("[1]")).toEqual({});
    expect(parseDraft('{"a":3,"b":"x","c":["y"],"d":{"z":1},"e":[1]}')).toEqual({
      a: 3,
      b: "x",
      c: ["y"],
    });
  });

  it("keeps separate drafts per ticket link", () => {
    expect(draftKey("ks", "t1")).not.toBe(draftKey("ks", "t2"));
    expect(draftKey("ks", null)).not.toBe(draftKey("ks", "t1"));
  });

  it("keeps one respondent id per browser", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    expect(respondentId(storage)).toBe(respondentId(storage));
  });
});
