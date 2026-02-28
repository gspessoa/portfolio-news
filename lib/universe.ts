export type Asset = {
  name: string;
  ticker: string;       // o ticker que tu usas (ex: ASML)
  exchange: string;     // ex: XNAS, XPAR...
  strategy: string;     // cluster
  providerSymbol: string; // símbolo para o Twelve Data (muito importante!)
};

// ⚠️ providerSymbol: Twelve Data normalmente usa formatos tipo:
// - US: ADBE
// - Euronext Paris: AI (pode ser "AI.PA" dependendo do provider)
// - Xetra: SAP (pode ser "SAP.DE")
// - LSE: KYGA (pode ser "KYGA.L")
// Isto varia. Começa com os EUA/mais fáceis e vais ajustando 1 a 1.
export const UNIVERSE: Asset[] = [
  { name: "ADOBE INC.", ticker: "ADBE", exchange: "XNAS", strategy: "AI & Digital Infra: AI / Semis / Automation / Robotics", providerSymbol: "ADBE" },
  { name: "PAYPAL HOLDINGS, INC.", ticker: "PYPL", exchange: "XNAS", strategy: "Others", providerSymbol: "PYPL" },
  { name: "PALO ALTO NETWORKS, INC.", ticker: "PANW", exchange: "XNAS", strategy: "Cybersecurity & Defense", providerSymbol: "PANW" },
  { name: "ALPHABET INC.", ticker: "GOOGL", exchange: "XNAS", strategy: "AI & Digital Infra: AI / Semis / Automation / Robotics", providerSymbol: "GOOGL" },

  // Continua a preencher aos poucos; começa por 10-15 e valida símbolos.
  // { name: "ASML Holding NV", ticker: "ASML", exchange: "XAMS", strategy: "...", providerSymbol: "ASML.AS" },
];