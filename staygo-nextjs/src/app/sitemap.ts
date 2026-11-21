import type { MetadataRoute } from 'next';
import { WEB_GAMES } from '@/data/webGames';
import { TOOLS } from '@/data/tools';
import { BOARD_GAMES } from '@/data/boardgames';

// Built into /sitemap.xml at export time from the same lists that render the site, so a game,
// tool or how-to-play page added to those lists is in the sitemap without editing it by hand.
export const dynamic = 'force-static';

const SITE = 'https://www.staygoch.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' = 'monthly') => ({
    url: `${SITE}${path}`,
    changeFrequency,
    priority,
  });
  return [
    page('/', 1, 'weekly'),
    page('/games/', 0.9, 'weekly'),
    page('/tools/', 0.9, 'weekly'),
    page('/how-to-play/', 0.9, 'weekly'),
    page('/how-to-play/random/', 0.8, 'weekly'),
    page('/watch/', 0.8, 'weekly'),
    page('/about/', 0.5),
    ...WEB_GAMES.map((g) => page(g.href, 0.8)),
    ...TOOLS.map((t) => page(t.href, 0.7)),
    ...BOARD_GAMES.map((g) => page(`/how-to-play/${g.slug}/`, 0.6)),
  ];
}
