import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Shared sitemap data for the custom /sitemap.xml index and the
// /sitemap/[id].xml shards (H5). Routes are Route Handlers, so they
// run per request — never at build time — which is why this lives
// here instead of Next's generateSitemaps: generateSitemaps is
// invoked during `next build` to enumerate ids, and the Supabase
// server client calls cookies(), which throws outside a request
// scope and breaks the build.

// PostgREST caps a single response at 1,000 rows, so shards are
// 1,000 — a 5,000-row range silently returns only the first 1,000
// and drops the rest.
export const BUSINESS_SHARD_SIZE = 1000

export type SitemapUrl = {
  loc: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: number
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function sitemapXml(urls: SitemapUrl[]): string {
  const entries = urls
    .map((u) => {
      const lastmod = u.lastmod
        ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>`
        : ''
      const changefreq = u.changefreq
        ? `<changefreq>${u.changefreq}</changefreq>`
        : ''
      const priority =
        u.priority !== undefined ? `<priority>${u.priority}</priority>` : ''
      return `<url><loc>${escapeXml(u.loc)}</loc>${lastmod}${changefreq}${priority}</url>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`
}

export function sitemapIndexXml(ids: number[], baseUrl: string): string {
  const entries = ids
    .map((id) => `<sitemap><loc>${escapeXml(`${baseUrl}/sitemap/${id}.xml`)}</loc></sitemap>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'
}

export async function getBusinessCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
  return count ?? 0
}

export function businessShardIds(total: number): number[] {
  const shards = Math.ceil(total / BUSINESS_SHARD_SIZE)
  return [0, ...Array.from({ length: shards }, (_, i) => i + 1)]
}

export async function getBusinessShard(shard: number): Promise<SitemapUrl[]> {
  const supabase = await createClient()
  const from = (shard - 1) * BUSINESS_SHARD_SIZE
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, created_at')
    .order('id', { ascending: true })
    .range(from, from + BUSINESS_SHARD_SIZE - 1)
  // Businesses have no updated_at — created_at is the last
  // modification we know.
  const url = baseUrl()
  return (businesses || []).map((business) => ({
    loc: `${url}/businesses/${business.id}`,
    lastmod: new Date(business.created_at).toISOString(),
    changefreq: 'monthly' as const,
    priority: 0.5,
  }))
}

export async function getCoreUrls(): Promise<SitemapUrl[]> {
  const supabase = await createClient()
  const url = baseUrl()

  // Get all active listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1000) // Limit to recent listings

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .limit(1000)

  // Tipos: only kinds that render a real page. A merged kind
  // redirects to its target and a rejected kind 404s, so neither
  // belongs in the sitemap; approved and pending kinds render.
  // The kinds query runs through the admin client: RLS hides
  // pending kinds from the anon key, but pending kinds render a
  // real page, so they belong here. Falls back to the anon client
  // (approved kinds only) if the service key is not configured.
  const admin = createAdminClient()
  const kindsClient = admin ?? supabase
  const { data: kinds } = await kindsClient
    .from('item_kinds')
    .select('slug')
    .in('status', ['approved', 'pending'])
    .order('slug', { ascending: true })
    .limit(500)

  const now = new Date().toISOString()
  return [
    { loc: url, lastmod: now, changefreq: 'hourly' as const, priority: 1 },
    {
      loc: `${url}/search`,
      lastmod: now,
      changefreq: 'daily' as const,
      priority: 0.8,
    },
    {
      loc: `${url}/garita`,
      lastmod: now,
      changefreq: 'hourly' as const,
      priority: 0.8,
    },
    {
      loc: `${url}/businesses/categorias`,
      lastmod: now,
      changefreq: 'weekly' as const,
      priority: 0.5,
    },
    {
      loc: `${url}/terms`,
      lastmod: '2026-02-25T00:00:00.000Z',
      changefreq: 'monthly' as const,
      priority: 0.3,
    },
    {
      loc: `${url}/privacy`,
      lastmod: '2026-02-25T00:00:00.000Z',
      changefreq: 'monthly' as const,
      priority: 0.3,
    },
    ...(listings || []).map((listing) => ({
      loc: `${url}/listings/${listing.id}`,
      lastmod: new Date(listing.updated_at).toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.7,
    })),
    ...(profiles || []).map((profile) => ({
      loc: `${url}/users/${profile.username}`,
      lastmod: new Date(profile.updated_at).toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.5,
    })),
    ...(kinds || []).map((kind) => ({
      loc: `${url}/tipos/${kind.slug}`,
      changefreq: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
