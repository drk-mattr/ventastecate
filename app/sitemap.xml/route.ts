import {
  baseUrl,
  businessShardIds,
  getBusinessCount,
  sitemapIndexXml,
} from '@/lib/sitemap'

// GET /sitemap.xml — the sitemap index (H5). Lists the core
// sitemap plus one shard per 1,000 businesses. Generated per
// request and cached for an hour; robots.txt points here.
export const revalidate = 3600

export async function GET() {
  const total = await getBusinessCount()
  const ids = businessShardIds(total)
  const xml = sitemapIndexXml(ids, baseUrl())
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
