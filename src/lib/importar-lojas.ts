// Normaliza nomes de lojas da planilha para os setores cadastrados.
const ALIAS: Record<string, string> = {
  "freguesia": "freguesia do o", "giovani gronchi": "giovanni gronchi", "morumbi": "giovanni gronchi",
  "sao miguel": "sao miguel paulista", "teotonio": "teotonio vilela", "marginal": "marginal tiete",
  "pinheiros": "pinheiros/jardins", "tecnologia": "ti", "radial": "radial leste", "curitiba": "curitiba - pr",
  "sao bernado": "sao bernardo do campo", "salvador (bh)": "salvador", "belo horizonte (minas gerais)": "belo horizonte",
};
export function normalizarNome(s: string) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function encontrarSetor<T extends { id: string; nome: string }>(loja: string, setores: T[]): T | undefined {
  const k = normalizarNome(loja);
  const alvo = ALIAS[k] ?? k;
  return setores.find((s) => normalizarNome(s.nome) === alvo);
}
