import { describe, expect, it } from "vitest";
import { dirOf, langOf, LANGS, otherLang, t } from "../src/lib/i18n";
import { displayTypeText, reasonText, statusText } from "../src/lib/domain";

describe("language choice", () => {
  it("falls back to Arabic for anything it does not recognise", () => {
    expect(langOf("en")).toBe("en");
    expect(langOf("ar")).toBe("ar");
    expect(langOf("fr")).toBe("ar");
    expect(langOf(undefined)).toBe("ar");
  });

  it("reads right to left only in Arabic", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });

  it("offers the other language", () => {
    expect(otherLang("ar")).toBe("en");
    expect(otherLang("en")).toBe("ar");
  });
});

describe("the dictionary", () => {
  it("says something different in each language", () => {
    expect(t("ar").entry.question).not.toBe(t("en").entry.question);
  });

  it("leaves no key missing in either language", () => {
    const keys = (o: object, prefix = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    for (const lang of LANGS) {
      expect(keys(t(lang)).sort()).toEqual(keys(t("ar")).sort());
    }
  });

  it("has no string left in the wrong script", () => {
    const arabic = /[؀-ۿ]/;
    const all = JSON.stringify(t("en"));
    expect(arabic.test(all)).toBe(false);
  });
});

describe("stored values in the reader's language", () => {
  it("shows English exactly as stored — it is what Mars reads", () => {
    expect(statusText("en", "Implemented")).toBe("Implemented");
    expect(reasonText("en", "OOS")).toBe("OOS");
    expect(displayTypeText("en", "GE")).toBe("GE");
  });

  it("translates only for Arabic", () => {
    expect(statusText("ar", "Implemented")).not.toBe("Implemented");
    expect(displayTypeText("ar", "GE")).toBe("القندولة");
  });

  it("hands back an unknown value rather than blanking it", () => {
    expect(statusText("ar", "Something New")).toBe("Something New");
    expect(reasonText("ar", "Unknown Code")).toBe("Unknown Code");
  });
});
