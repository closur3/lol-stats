export function parseMatchScore(value, label) {
  if (value === "" || value === null || value === undefined) return 0;
  const score = Number.parseInt(value, 10);
  if (!Number.isInteger(score) || score < 0) throw new Error(`Invalid score: ${label}`);
  return score;
}

export function parseMatchBestOf(value, label) {
  const bestOf = Number.parseInt(value, 10);
  if (![1, 2, 3, 5].includes(bestOf)) throw new Error(`Unsupported BestOf: ${label}`);
  return bestOf;
}

export function parseMatchWinner(value, label) {
  if (value === "" || value === null) return null;
  if (value === undefined) throw new Error(`Missing Winner: ${label}`);
  const winner = Number.parseInt(value, 10);
  if (![0, 1, 2].includes(winner)) throw new Error(`Invalid Winner: ${label}`);
  return winner;
}
