import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toDetailPath } from './urlUtils';
import HeroBanner from './HeroBanner';
import TrendingRow from './TrendingRow';
import ContinueWatchingRow from './ContinueWatchingRow';
import SEO from './SEO';
import { fetchHome, normalizeHomeSection, fetchMbGenre } from './Fetcher';

const GENRE_QUERIES = [
  { title: 'Action & Thriller', query: 'action' },
  { title: 'Comedy', query: 'comedy' },
  { title: 'Horror & Suspense', query: 'horror' },
  { title: 'Romance', query: 'romance' },
  { title: 'Sci-Fi & Fantasy', query: 'sci-fi' },
  { title: 'Drama', query: 'drama' },
  { title: 'Animation', query: 'animation' },
  { title: 'Crime & Mystery', query: 'crime' },
  { title: 'Adventure', query: 'adventure' },
  { title: 'Documentary', query: 'documentary' },
];

const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-4 px-4 sm:px-6 mb-8 mt-4">
    <div className="flex-1 h-px bg-white/[0.05]" />
    <span className="text-gray-600 text-[11px] font-bold uppercase tracking-[0.25em]">{label}</span>
    <div className="flex-1 h-px bg-white/[0.05]" />
  </div>
);

const RowSkeleton = () => (
  <section className="mb-10">
    <div className="flex items-center gap-3 px-4 sm:px-6 mb-5">
      <div className="w-24 h-5 rounded-md bg-white/[0.06] animate-pulse" />
    </div>
    <div className="flex gap-2.5 px-4 sm:px-6 overflow-hidden">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[130px] md:w-[150px] h-[195px] md:h-[225px] rounded-xl bg-white/[0.05] animate-pulse" />
      ))}
    </div>
  </section>
);

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [genreSections, setGenreSections] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const genresFetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHome();
        if (cancelled) return;
        const rawSections = data?.data?.operatingList || data?.data?.items || data?.data?.sections || data?.data?.list || data?.items || data?.sections || [];
        const parsed = rawSections
          .filter((sec) => {
            const items = sec.subjects || sec.items || sec.list || [];
            return items.length > 0;
          })
          .map((sec) => ({
            title: sec.title || sec.name || 'Featured',
            items: normalizeHomeSection(sec),
          }))
          .filter((s) => s.items.length > 0);
        setSections(parsed);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (genresFetchedRef.current) return;
    genresFetchedRef.current = true;
    let cancelled = false;

    (async () => {
      const accumulated = [];
      const batchSize = 3;
      for (let i = 0; i < GENRE_QUERIES.length; i += batchSize) {
        const batch = GENRE_QUERIES.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(g => fetchMbGenre(g.query))
        );
        for (let j = 0; j < batch.length; j++) {
          const r = batchResults[j];
          if (r.status === 'fulfilled' && r.value.length > 0) {
            accumulated.push({ title: batch[j].title, items: r.value });
          }
        }
        if (cancelled) return;
        setGenreSections([...accumulated]);
        if (accumulated.length > 0) setGenresLoading(false);
      }
      if (!cancelled) setGenresLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (item) => {
    const mediaType = item.subjectType !== 1 ? 'tv' : 'movie';
    const pathname = toDetailPath(mediaType, item.subjectId, item.title);
    navigate(
      { pathname },
      { state: { from: location.pathname + location.search } }
    );
  };

  const handleContinueSelect = useCallback((item, mediaType) => {
    const pathname = toDetailPath(mediaType, item.id, item.title);
    navigate(
      { pathname, search: item.season ? `?season=${item.season}&episode=${item.episode || 1}` : '' },
      { state: { from: location.pathname + location.search } }
    );
  }, [navigate, location]);

  const goSearch = () => navigate('/search');

  const ACCENT_COLORS = ['#ef4444', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#f43f5e'];

  const allSections = [];
  let genreCursor = 0;
  let genreDividerShown = false;

  for (let idx = 0; idx < sections.length; idx++) {
    allSections.push({
      ...sections[idx],
      showRank: idx === 0,
      accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
      key: `home-${idx}`,
    });

    if (idx > 0 && idx % 2 === 1 && genreCursor < genreSections.length) {
      if (!genreDividerShown) {
        allSections.push({ isDividerOnly: true, key: `genre-divider` });
        genreDividerShown = true;
      }
      const gs = genreSections[genreCursor];
      allSections.push({
        ...gs,
        showRank: false,
        accent: ACCENT_COLORS[(sections.length + genreCursor) % ACCENT_COLORS.length],
        key: `genre-${genreCursor}`,
      });
      genreCursor++;
    }
  }

  while (genreCursor < genreSections.length) {
    if (!genreDividerShown) {
      allSections.push({ isDividerOnly: true, key: `genre-divider` });
      genreDividerShown = true;
    }
    const gs = genreSections[genreCursor];
    allSections.push({
      ...gs,
      showRank: false,
      accent: ACCENT_COLORS[(sections.length + genreCursor) % ACCENT_COLORS.length],
      key: `genre-${genreCursor}`,
    });
    genreCursor++;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[#0a0c12] min-h-screen"
    >
      <SEO
        title="PopCorn TV — Stream Movies & TV Shows"
        description="Watch trending movies and TV shows for free. Browse by genre, discover new releases, and stream instantly on PopCorn TV."
        noSuffix
      />
      <HeroBanner />

      <div className="pt-10 pb-8">
        <ContinueWatchingRow onSelect={handleContinueSelect} />

        {allSections.map((sec, idx) => {
          if (sec.isDividerOnly) return <SectionDivider key={sec.key} label="Browse by Genre" />;
          return (
            <div key={sec.key}>
              {idx > 0 && idx % 5 === 0 && !sec.isDividerOnly && <SectionDivider label="More to Watch" />}
              <TrendingRow
                title={sec.title}
                items={sec.items}
                showRank={sec.showRank}
                accent={sec.accent}
                onSelect={handleSelect}
                onSeeAll={goSearch}
              />
            </div>
          );
        })}

        {genresLoading && sections.length > 0 && (
          <>
            <SectionDivider label="Browse by Genre" />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}

        {sections.length === 0 && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}
      </div>
    </motion.div>
  );
}
