import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AreasPage from "@/app/areas/page";
import Home from "@/app/page";
import { ACTIVE_ROOT_KEYS, ROOT_LABELS } from "@/lib/regions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("customer-facing root region cards", () => {
  it("uses concise labels on the home and full region directory cards", () => {
    const homeHtml = renderToStaticMarkup(<Home />);
    const areasHtml = renderToStaticMarkup(<AreasPage />);

    for (const key of ACTIVE_ROOT_KEYS) {
      const { full, short } = ROOT_LABELS[key];
      expect(areasHtml).toContain(`<strong>${short}</strong>`);
      if (full !== short) {
        expect(homeHtml).not.toContain(full);
        expect(areasHtml).not.toContain(full);
      }
    }

    for (const key of ACTIVE_ROOT_KEYS.slice(0, 8)) {
      const short = ROOT_LABELS[key].short;
      expect(homeHtml).toContain(`<h3>${short}</h3>`);
    }
  });
});
