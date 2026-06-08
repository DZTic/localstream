import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Effectue une requête HTTP vers une API externe.
 * - Sur Android (natif) : via CapacitorHttp, qui contourne nativement le CORS.
 * - Sur le web : via le proxy Express (/api/os/proxy) défini dans server.ts.
 * Retourne une interface compatible fetch (json()/text()).
 */
export const externalRequest = async (opts: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ json: () => Promise<any>; text: () => Promise<string> }> => {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url: opts.url,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      data: opts.body,
    });
    return {
      json: async () => (typeof res.data === 'string' ? JSON.parse(res.data) : res.data),
      text: async () => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
    };
  }
  const response = await fetch('/api/os/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  return {
    json: () => response.json(),
    text: () => response.text(),
  };
};
