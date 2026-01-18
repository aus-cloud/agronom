import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufgadyosoeprynwdtahz.supabase.co'
const supabaseAnonKey = 'sb_publishable__cIoXi8c2SfJoaAskWHqNg_o-uphJUP'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)