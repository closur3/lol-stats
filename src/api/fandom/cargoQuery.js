export function cargoStringLiteral(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid Cargo string: ${label}`);
  }
  if (/[\0\r\n]/.test(value)) {
    throw new Error(`Invalid Cargo string control char: ${label}`);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export function assertCargoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid Cargo date: ${label}`);
  }
}
