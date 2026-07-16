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

function parseMatchWinner(value, label) {
  if (value === "" || value === null) return null;
  if (value === undefined) throw new Error(`Missing Winner: ${label}`);
  const winner = Number.parseInt(value, 10);
  if (![0, 1, 2].includes(winner)) throw new Error(`Invalid Winner: ${label}`);
  return winner;
}

function parseMatchForfeitSide(value, label) {
  if (value === "" || value === null) return null;
  if (value === undefined) throw new Error(`Missing FF: ${label}`);
  const forfeitSide = Number.parseInt(value, 10);
  if (![0, 1, 2].includes(forfeitSide)) throw new Error(`Invalid FF: ${label}`);
  return forfeitSide;
}

function parseMatchIsNullified(value, label) {
  if (value === undefined) throw new Error(`Missing IsNullified: ${label}`);
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  throw new Error(`Invalid IsNullified: ${label}`);
}

function validateMatchOutcome(winner, forfeitSide, isNullified, label) {
  if (isNullified && winner === null) throw new Error(`Nullified match must have Winner: ${label}`);
  if (forfeitSide === 1 && winner !== 2) throw new Error(`FF Team1 requires Winner 2: ${label}`);
  if (forfeitSide === 2 && winner !== 1) throw new Error(`FF Team2 requires Winner 1: ${label}`);
  if (forfeitSide === 0 && winner !== 0) throw new Error(`FF both requires Winner 0: ${label}`);
}

export function parseMatchOutcome(match, label) {
  const winner = parseMatchWinner(match.Winner, `${label}.Winner`);
  const forfeitSide = parseMatchForfeitSide(match.FF, `${label}.FF`);
  const isNullified = parseMatchIsNullified(match.IsNullified, `${label}.IsNullified`);
  validateMatchOutcome(winner, forfeitSide, isNullified, label);
  return { winner, isForfeit: forfeitSide !== null, isNullified };
}
