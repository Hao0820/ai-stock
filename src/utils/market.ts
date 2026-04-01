/**
 * ADR Mapping Utility
 * Maps Taiwan (TWSE) stock symbols to their corresponding US ADR symbols.
 */

const ADR_MAPPINGS: Record<string, string> = {
  '2330.TW': 'TSM',   // TSMC
  '2303.TW': 'UMC',   // UMC
  '3711.TW': 'ASX',   // ASE
  '2412.TW': 'CHT',   // Chunghwa Telecom
  '2409.TW': 'AUOTY', // AUO
};

/**
 * Returns the US ADR symbol for a given Taiwan stock symbol.
 * Returns null if no mapping exists.
 */
export function getADRSymbol(symbol: string): string | null {
  const upperSymbol = symbol.trim().toUpperCase();
  return ADR_MAPPINGS[upperSymbol] || null;
}
