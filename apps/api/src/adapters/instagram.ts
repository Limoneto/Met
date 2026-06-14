// MET — adapter de Instagram (Graph API con Instagram Login / Basic Display).
// Anti-corruption: el dominio no conoce a Instagram; sólo este archivo le habla.
// Necesita un access token de larga duración de una cuenta Business/Creator.

export interface IgPost {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
}

const BASE = "https://graph.instagram.com";

// Devuelve el username conectado (valida el token de paso).
export async function fetchInstagramUsername(token: string): Promise<string> {
  const res = await fetch(`${BASE}/me?fields=username&access_token=${encodeURIComponent(token)}`);
  const json = (await res.json()) as { username?: string; error?: { message: string } };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Instagram respondió ${res.status}`);
  return json.username ?? "";
}

export async function fetchInstagramMedia(token: string, limit = 12): Promise<IgPost[]> {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const res = await fetch(`${BASE}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`);
  const json = (await res.json()) as { data?: any[]; error?: { message: string } };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Instagram respondió ${res.status}`);
  return (json.data ?? []).map((p) => ({
    id: String(p.id),
    caption: p.caption ?? null,
    mediaType: p.media_type ?? null,
    mediaUrl: p.media_url ?? null,
    thumbnailUrl: p.thumbnail_url ?? null,
    permalink: p.permalink ?? null,
    timestamp: p.timestamp ?? null,
  }));
}
