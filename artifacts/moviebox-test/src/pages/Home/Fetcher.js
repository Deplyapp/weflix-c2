import { apiFetch, clearCache } from '../../lib/api';
import {
  bffHome,
  bffSearch as bffSearchDirect,
  bffDetail,
  bffSeasons,
  bffPlayInfo,
  bffSubtitles,
  isClientBffEnabled,
} from '../../lib/bffClient';

const RETRY_DELAYS = [1000, 3000, 8000];

async function fetchWithRetry(path, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiFetch(path);
    } catch (err) {
      if (attempt < maxRetries) {
        clearCache(path);
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 8000));
      } else {
        throw err;
      }
    }
  }
}

export async function fetchHome() {
  if (isClientBffEnabled()) {
    try {
      const data = await bffHome();
      if (data?.data?.items?.length > 0 || data?.data?.operatingList?.length > 0) {
        return data;
      }
    } catch {}
  }
  return apiFetch('/stream/mb-home');
}

export async function fetchMbSearch(query, page = 1) {
  if (isClientBffEnabled()) {
    try {
      const data = await bffSearchDirect(query, page);
      if (data?.data) {
        const items = data.data.subjects || data.data.items || data.data.list || [];
        return {
          items,
          totalCount: data.data.totalCount || data.data.pager?.totalCount || items.length,
          hasMore: data.data.hasMore ?? data.data.pager?.hasMore ?? items.length >= 20,
        };
      }
    } catch {}
  }
  return apiFetch(`/stream/mb-search?q=${encodeURIComponent(query)}&page=${page}`);
}

export async function fetchMbGenre(keyword, page = 1) {
  if (isClientBffEnabled()) {
    try {
      const data = await bffSearchDirect(keyword, page);
      if (data?.data) {
        const items = data.data.subjects || data.data.items || data.data.list || [];
        return items.map(item => ({
          subjectId: String(item.subjectId || item.id || ''),
          title: item.title || item.name || '',
          description: item.description || item.overview || '',
          cover: item.cover?.url || item.coverUrl || item.poster || '',
          backdrop: item.backdrop?.url || item.backdropUrl || item.cover?.url || '',
          releaseDate: item.releaseDate || item.release_date || '',
          subjectType: item.subjectType ?? (item.type === 'movie' ? 1 : 2),
          rating: item.imdbRatingValue || item.rating || '',
          genre: item.genre || '',
          hasResource: item.hasResource !== false,
        })).filter(i => i.cover && i.title);
      }
    } catch {}
  }
  const data = await apiFetch(`/stream/mb-search?q=${encodeURIComponent(keyword)}&page=${page}`);
  const items = data?.data?.subjects || data?.data?.list || data?.subjects || [];
  return items.map(item => ({
    subjectId: String(item.subjectId || item.id || ''),
    title: item.title || item.name || '',
    description: item.description || item.overview || '',
    cover: item.cover?.url || item.coverUrl || item.poster || '',
    backdrop: item.backdrop?.url || item.backdropUrl || item.cover?.url || '',
    releaseDate: item.releaseDate || item.release_date || '',
    subjectType: item.subjectType ?? (item.type === 'movie' ? 1 : 2),
    rating: item.imdbRatingValue || item.rating || '',
    genre: item.genre || '',
    hasResource: item.hasResource !== false,
  })).filter(i => i.cover && i.title);
}

export async function fetchMbDetail(subjectId, titleHint) {
  if (isClientBffEnabled()) {
    try {
      const data = await bffDetail(subjectId);
      if (data?.data) return data.data;
    } catch {}
  }
  let path = `/stream/mb-detail?subjectId=${encodeURIComponent(subjectId)}`;
  if (titleHint) path += `&title=${encodeURIComponent(titleHint)}`;
  return fetchWithRetry(path);
}

export async function fetchMbSeasons(subjectId) {
  if (isClientBffEnabled()) {
    try {
      const data = await bffSeasons(subjectId);
      if (data?.data) {
        const raw = data.data;
        if (raw.seasons) return raw;
        if (Array.isArray(raw)) return { seasons: raw };
        return raw;
      }
    } catch {}
  }
  return fetchWithRetry(`/stream/mb-seasons?subjectId=${encodeURIComponent(subjectId)}`);
}

export async function fetchMbStream(subjectId, type, se, ep, title) {
  const qs = new URLSearchParams({ subjectId });
  if (type) qs.set('type', type);
  if (se != null) qs.set('se', String(se));
  if (ep != null) qs.set('ep', String(ep));
  if (title) qs.set('title', title);
  return apiFetch(`/stream/mb-stream?${qs}`);
}

export async function fetchMbSubtitles(subjectId, title) {
  if (isClientBffEnabled()) {
    try {
      const data = await bffSubtitles(subjectId);
      if (data?.data?.items?.length > 0) return data.data.items;
    } catch {}
  }
  try {
    const data = await apiFetch(`/stream/mb-subtitles?subjectId=${encodeURIComponent(subjectId)}`);
    if (data?.subtitles?.length > 0) return data.subtitles;
  } catch {}
  try {
    const qs = new URLSearchParams({ subjectId });
    if (title) qs.set("title", title);
    const data = await apiFetch(`/stream/mb-resource?${qs}`);
    if (data?.subtitles?.length > 0) return data.subtitles;
  } catch {}
  return [];
}

export function mbCoverUrl(cover, width = 300) {
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  return cover.url || null;
}

export function mbTypeLabel(subjectType) {
  return subjectType === 1 ? 'movie' : 'tv';
}

export function normalizeHomeSection(section) {
  if (!section) return [];
  const items = section.subjects || section.items || section.list || [];
  return items.map(item => ({
    subjectId: String(item.subjectId || item.id || ''),
    title: item.title || item.name || '',
    description: item.description || item.overview || '',
    cover: item.cover?.url || item.coverUrl || item.poster || '',
    backdrop: item.backdrop?.url || item.backdropUrl || item.cover?.url || '',
    releaseDate: item.releaseDate || item.release_date || '',
    subjectType: item.subjectType ?? (item.type === 'movie' ? 1 : 2),
    rating: item.imdbRatingValue || item.rating || '',
    genre: item.genre || '',
    hasResource: item.hasResource !== false,
  }));
}
