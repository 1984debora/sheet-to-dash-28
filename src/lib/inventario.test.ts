import { describe, expect, it } from "vitest";
import { statusGarantia } from "./inventario";

const hoje = new Date("2026-11-04T12:00:00");

describe("statusGarantia", () => {
  it("vencida quando a data já passou", () => {
    expect(statusGarantia("2026-11-01", hoje)).toBe("vencida");
  });
  it("vencendo quando faltam até 30 dias", () => {
    expect(statusGarantia("2026-11-20", hoje)).toBe("vencendo");
  });
  it("vigente quando faltam mais de 30 dias", () => {
    expect(statusGarantia("2027-03-01", hoje)).toBe("vigente");
  });
});
