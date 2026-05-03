import { ProxyAgent } from "undici";

export async function fetchWithProxy(
  url: string,
  timeoutMs?: number
): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const options: RequestInit & { dispatcher?: ProxyAgent } = {};

  if (timeoutMs) {
    options.signal = AbortSignal.timeout(timeoutMs);
  }

  if (proxy) {
    options.dispatcher = new ProxyAgent(proxy);
  }

  return fetch(url, options);
}
