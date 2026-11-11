import { describe, expect, it } from "vitest";
import { encontrarSetor } from "./importar-lojas";
const setores = [{ id: "1", nome: "Freguesia do Ó" }, { id: "2", nome: "Butantã" }, { id: "3", nome: "Giovanni Gronchi" }];
describe("encontrarSetor", () => {
  it("aceita nome sem acento", () => expect(encontrarSetor("Butanta", setores)?.id).toBe("2"));
  it("aceita apelido da planilha", () => expect(encontrarSetor("Freguesia", setores)?.id).toBe("1"));
  it("corrige grafia Giovani", () => expect(encontrarSetor("Giovani Gronchi", setores)?.id).toBe("3"));
  it("retorna vazio para loja desconhecida", () => expect(encontrarSetor("Marte", setores)).toBeUndefined());
});
