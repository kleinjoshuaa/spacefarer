import type {
  Commander,
  GalaxyMeta,
  MarketState,
  SystemDetail,
  SystemSummary,
} from "@spacefarer/shared";

export interface GalaxyResponse extends GalaxyMeta {
  systems: SystemSummary[];
}

export interface MarketResponse extends MarketState {
  epoch: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Ignore body parse errors and keep the generic message.
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  galaxy: () => request<GalaxyResponse>("/api/galaxy"),
  system: (id: number) => request<SystemDetail>(`/api/system/${id}`),
  market: (id: number) => request<MarketResponse>(`/api/system/${id}/market`),
  createCommander: (name: string) =>
    request<Commander>("/api/commander", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  commander: (id: string) => request<Commander>(`/api/commander/${id}`),
  buy: (id: string, goodId: string, quantity: number) =>
    request<Commander>(`/api/commander/${id}/buy`, {
      method: "POST",
      body: JSON.stringify({ goodId, quantity }),
    }),
  sell: (id: string, goodId: string, quantity: number) =>
    request<Commander>(`/api/commander/${id}/sell`, {
      method: "POST",
      body: JSON.stringify({ goodId, quantity }),
    }),
  jump: (id: string, targetSystem: number) =>
    request<Commander>(`/api/commander/${id}/jump`, {
      method: "POST",
      body: JSON.stringify({ targetSystem }),
    }),
  refuel: (id: string, amount: number) =>
    request<Commander>(`/api/commander/${id}/refuel`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  repair: (id: string) =>
    request<Commander>(`/api/commander/${id}/repair`, { method: "POST" }),
  combat: (id: string, kills: number, damageTaken: number) =>
    request<Commander>(`/api/commander/${id}/combat`, {
      method: "POST",
      body: JSON.stringify({ kills, damageTaken }),
    }),
};
