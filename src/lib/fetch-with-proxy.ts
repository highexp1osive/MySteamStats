import { ProxyAgent } from "undici";

export async function fetchWithProxy(
  url: string,
  init?: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const options: RequestInit & { dispatcher?: any } = { ...init };

  if (timeoutMs) {
    options.signal = AbortSignal.timeout(timeoutMs);
  }

  if (proxy) {
    options.dispatcher = new ProxyAgent({
      uri: proxy,
      requestTls: { rejectUnauthorized: false },
    });
  }

  return fetch(url, options);
}
