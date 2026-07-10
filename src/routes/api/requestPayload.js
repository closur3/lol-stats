export async function readJsonPayload(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
}
