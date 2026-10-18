import { getSupabaseClient } from './client'

export type Profile = {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', userId)
    .single()

  if (error) throw error
  const r = data as Record<string, unknown>
  return {
    id: r['id'] as string,
    name: (r['name'] as string | null) ?? null,
    email: (r['email'] as string | null) ?? null,
    avatarUrl: (r['avatar_url'] as string | null) ?? null,
  }
}

export async function updateProfile(
  userId: string,
  input: { name?: string; avatarUrl?: string | null },
): Promise<void> {
  const supabase = getSupabaseClient()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch['name'] = input.name
  if (input.avatarUrl !== undefined) patch['avatar_url'] = input.avatarUrl

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

const MAX_AVATAR_BYTES = 200 * 1024 // 200 KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed.')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be 200 KB or smaller.')
  }

  const supabase = getSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Bust cache so the browser fetches the new image
  return `${data.publicUrl}?t=${Date.now()}`
}
