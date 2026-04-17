import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toDetailPath } from './urlUtils';
import HeroBanner from './HeroBanner';
import TrendingRow from './TrendingRow';
import ContinueWatchingRow from './ContinueWatchingRow';
import SEO from './SEO';
import { fetchHome, normalizeHomeSection } from './Fetcher';

const MAX_HOME_ROWS = 3;

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
          .filter((s) => s.items.length > 0)
          .slice(0, MAX_HOME_ROWS);
        setSections(parsed);
      } catch { /* ignore */ }
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

  const allSections = sections.map((s, idx) => ({
    ...s,
    showRank: idx === 0,
    accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    key: `home-${idx}`,
  }));

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

        {allSections.map((sec) => (
          <TrendingRow
            key={sec.key}
            title={sec.title}
            items={sec.items}
            showRank={sec.showRank}
            accent={sec.accent}
            onSelect={handleSelect}
            onSeeAll={goSearch}
          />
        ))}

        {sections.length === 0 && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}
      </div>
    </motion.div>
  );
}
