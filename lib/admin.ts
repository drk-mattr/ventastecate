import { createClient } from '@/lib/supabase/server'

/** Server-only: returns the profile only when the signed-in user is a superadmin. */
export async function getSuperadminProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_superadmin')
    .eq('id', user.id)
    .single()
  if (!profile || !(profile as { is_superadmin?: boolean }).is_superadmin) return null
  return profile
}
