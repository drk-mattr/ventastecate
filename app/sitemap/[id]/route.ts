import {
  BUSINESS_SHARD_SIZE,
  getBusinessCount,
  getBusinessShard,
  getCoreUrls,
  sitemapXml,
} from '@/lib/sitemap'

// GET /sitemap/<id>.xml — one sitemap shard (H5).
// id 0: static + listings + profiles + tipos + categorias + garita.
// id 1..N: businesses, 1,000 per shard. Anything else 404s.
export const revalidate = 3600

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  // The shard URL is /sitemap/<id>.xml, so the segment arrives
  // as "0.xml" — strip the suffix before parsing.
  const shard = Number(id.replace(/\.xml$/, ''))
  if (!Number.isInteger(shard) || shard < 0) {
    return new Response('Not found', { status: 404 })
  }
  if (shard === 0) {
    const urls = await getCoreUrls()
    return new Response(sitemapXml(urls), {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
  const total = await getBusinessCount()
  const shards = Math.ceil(total / BUSINESS_SHARD_SIZE)
  if (shard > shards) {
    return new Response('Not found', { status: 404 })
  }
  const urls = await getBusinessShard(shard)
  return new Response(sitemapXml(urls), {
    headers: { 'Content-Type': 'application/xml' },
  })
}
