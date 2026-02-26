import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'

  // Static pages
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2026-02-25'),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2026-02-25'),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ]

  // Listing pages
  const listingRoutes = (listings || []).map((listing) => ({
    url: `${baseUrl}/listings/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // User profile pages
  const profileRoutes = (profiles || []).map((profile) => ({
    url: `${baseUrl}/users/${profile.username}`,
    lastModified: new Date(profile.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...routes, ...listingRoutes, ...profileRoutes]
}
