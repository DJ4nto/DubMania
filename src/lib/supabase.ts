import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { Database } from '../types/database';

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'dubmania-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
    global: {
      headers: {
        'x-application-name': 'dubmania-web',
      },
    },
  },
);
