/** Coppie univoche torneo tipo girone unico round (ogni squadra incontra una volta le altre). */
export function roundRobinPairs(teamIds: string[]): Array<{ home: string; away: string }> {
  const out: Array<{ home: string; away: string }> = []
  const ids = [...teamIds]
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      out.push({ home: ids[i]!, away: ids[j]! })
    }
  }
  return out
}
