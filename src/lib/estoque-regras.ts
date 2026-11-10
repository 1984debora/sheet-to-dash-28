export function setorEhTI(nome: string) {
  return /^(ti|t\.?\s*i\.?|tecnologia da informa[cç][aã]o|inform[aá]tica)$/i.test(nome.trim());
}
export function disponivelNoEstoque(equip: { status: string }) {
  return equip.status === "Em estoque";
}