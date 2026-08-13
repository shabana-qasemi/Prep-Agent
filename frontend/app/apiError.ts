// FastAPI error responses are JSON like {"detail": "..."} — fall back to the
// raw response body if it isn't (e.g. an unexpected proxy/network error page).
export function extractErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // not JSON — fall through
  }
  return `Server responded with ${status}: ${body}`;
}
