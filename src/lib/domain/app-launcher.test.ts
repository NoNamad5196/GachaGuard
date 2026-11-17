import { describe, expect, it } from "vitest";

import { getOtakuSServices, validUrl } from "@/components/app/app-launcher";

describe("AppLauncher domain helpers", () => {
  it("validates HTTPS URLs and rejects invalid or non-HTTPS protocols", () => {
    expect(validUrl("https://sipsungjang.example.com")).toBe("https://sipsungjang.example.com/");
    expect(validUrl("https://otakuhub.example.com/events")).toBe(
      "https://otakuhub.example.com/events",
    );
    expect(validUrl("http://sipsungjang.example.com")).toBeNull();
    expect(validUrl("javascript:alert(1)")).toBeNull();
    expect(validUrl("not-a-url")).toBeNull();
    expect(validUrl("")).toBeNull();
    expect(validUrl(undefined)).toBeNull();
  });

  it("returns GachaGuard as the current service and resolves sibling HTTPS URLs", () => {
    const services = getOtakuSServices({
      NEXT_PUBLIC_SIPSUNGJANG_URL: "https://sipsungjang.example.com",
      NEXT_PUBLIC_OTAKUHUB_URL: "http://insecure.example.com",
    });

    expect(services).toEqual([
      {
        id: "sipsungjang",
        name: "SipSungJang",
        description: "육성 · 주간 목표 · 플레이 수첩",
        icon: "✦",
        color: "#c9a84c",
        href: "https://sipsungjang.example.com/",
        current: false,
      },
      {
        id: "otakuhub",
        name: "OtakuHub",
        description: "게임 · 서브컬처 이벤트와 일정",
        icon: "◈",
        color: "#6ab0e8",
        href: null,
        current: false,
      },
      {
        id: "gachaguard",
        name: "GachaGuard",
        description: "소비 기록 · 예산 · 과금 돌아보기",
        icon: "⊕",
        color: "#a882e8",
        href: "/dashboard",
        current: true,
      },
    ]);
  });
});
