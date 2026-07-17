import { createClient } from "@supabase/supabase-js";

// This client uses the service_role key and must NEVER be imported
// into client-side ("use client") code. Only used inside /pages/api routes.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
