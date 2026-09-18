// Placeholder Supabase untuk migrasi nanti (SRS §4.2).
// MVP memakai mockDb. Saat project Supabase siap, isi VITE_SUPABASE_URL & KEY
// lalu ganti pemanggilan mockDb dengan client ini secara bertahap.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(url && anon)
export const supabase = supabaseReady ? createClient(url, anon) : null
