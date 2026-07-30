// SERVER-SIDE ONLY — never import this in client components
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      // Prevents the client from trying to use localStorage on the server,
      // which would crash API routes with "localStorage is not defined"
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
