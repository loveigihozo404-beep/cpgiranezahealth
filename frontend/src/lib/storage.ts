import { supabase } from './supabase'

export type StorageBucket = 'course-files' | 'certificates' | 'gallery' | 'career-files' | 'profile-images' | 'homecare-files'
export type UploadedFile = { path: string; name: string; type: string; size: number }

const SAFE_NAME = /^[a-z0-9][a-z0-9._-]*$/i

export async function uploadStoredFile(bucket: StorageBucket, pathPrefix: string, file: File, rules: { accept: string; maxBytes: number }): Promise<UploadedFile> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!file.size) throw new Error('The selected file is empty.')
  if (file.size > rules.maxBytes) throw new Error(`File is too large. Maximum size is ${Math.ceil(rules.maxBytes / 1024 / 1024)} MB.`)
  const accepted = rules.accept.split(',').map(item => item.trim().toLowerCase())
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const typeAllowed = accepted.includes(file.type.toLowerCase()) || accepted.includes(`.${extension}`) || accepted.includes('*/*')
  if (!typeAllowed) throw new Error('This file type is not supported.')

  const baseName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').toLowerCase()
  if (!SAFE_NAME.test(baseName)) throw new Error('The file name is not safe.')
  const path = `${pathPrefix.replace(/^\/+|\/+$/g, '')}/${crypto.randomUUID()}-${baseName}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return { path, name: file.name, type: file.type, size: file.size }
}

export async function createPrivateFileUrl(bucket: StorageBucket, path: string, expiresIn = 300): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw error ?? new Error('File is unavailable.')
  return data.signedUrl
}

export function getPublicFileUrl(bucket: StorageBucket, path: string): string {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function removeStoredFile(bucket: StorageBucket, path?: string) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

export async function moveStoredFile(bucket: StorageBucket, from: string, to: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.storage.from(bucket).move(from, to)
  if (error) throw error
  return to
}
