export async function kvPut(env, key, value) {
  console.log(`[KV:PUT] ${key}`);
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return env["lol-stats-kv"].put(key, payload);
}

export async function kvDelete(env, key) {
  console.log(`[KV:DEL] ${key}`);
  return env["lol-stats-kv"].delete(key);
}
