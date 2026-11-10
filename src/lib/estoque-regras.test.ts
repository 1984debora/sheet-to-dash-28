import { describe, it, expect } from "vitest";
import { disponivelNoEstoque, setorEhTI } from "./estoque-regras";

describe("Subgrupo Estoque da TI", () => {
  it("aparece dentro do setor TI, não nas lojas", () => {
    expect(setorEhTI("TI")).toBe(true);
    expect(setorEhTI("Loja 1")).toBe(false);
  });
  it("lista somente equipamentos disponíveis em estoque", () => {
    expect(["Em uso", "Em estoque", "Em manutenção", "Descartado"].filter(status => disponivelNoEstoque({ status }))).toEqual(["Em estoque"]);
  });
});