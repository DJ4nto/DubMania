import { createClient } from '@supabase/supabase-js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ExpiredLobby {
  lobby_id: string;
  storage_paths: string[] | null;
}

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(
  async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse(
        { error: 'Method not allowed' },
        405,
      );
    }

    const cronSecret = Deno.env.get(
      'DUBMANIA_CRON_SECRET',
    );

    const providedSecret = request.headers.get(
      'x-cron-secret',
    );

    if (
      !cronSecret ||
      !providedSecret ||
      providedSecret !== cronSecret
    ) {
      return jsonResponse(
        { error: 'Unauthorized' },
        401,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    const serviceRoleKey = Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
      );

      return jsonResponse(
        { error: 'Missing server configuration' },
        500,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: maintenanceData,
      error: maintenanceError,
    } = await supabase.rpc('run_game_maintenance');

    if (maintenanceError) {
      console.error(
        'run_game_maintenance failed',
        maintenanceError,
      );

      return jsonResponse(
        {
          error: 'Maintenance RPC failed',
          details: maintenanceError.message,
        },
        500,
      );
    }

    const {
      data: expiredData,
      error: expiredError,
    } = await supabase.rpc(
      'get_expired_lobbies_for_cleanup',
      {
        p_limit: 25,
      },
    );

    if (expiredError) {
      console.error(
        'get_expired_lobbies_for_cleanup failed',
        expiredError,
      );

      return jsonResponse(
        {
          error: 'Expired lobby query failed',
          details: expiredError.message,
        },
        500,
      );
    }

    const expiredLobbies = (expiredData ?? []) as ExpiredLobby[];

    const cleanedLobbyIds: string[] = [];
    const failedLobbyIds: string[] = [];

    for (const lobby of expiredLobbies) {
      try {
        const paths = Array.from(
          new Set(lobby.storage_paths ?? []),
        );

        if (paths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove(paths);

          if (storageError) {
            throw storageError;
          }
        }

        const {
          data: deleted,
          error: deleteError,
        } = await supabase.rpc(
          'delete_cleaned_lobby',
          {
            p_lobby_id: lobby.lobby_id,
          },
        );

        if (deleteError) {
          throw deleteError;
        }

        if (deleted === true) {
          cleanedLobbyIds.push(lobby.lobby_id);
        }
      } catch (caughtError: unknown) {
        console.error(
          `Cleanup failed for ${lobby.lobby_id}`,
          caughtError,
        );

        failedLobbyIds.push(lobby.lobby_id);
      }
    }

    return jsonResponse({
      maintenance: maintenanceData,
      expiredFound: expiredLobbies.length,
      cleanedLobbyIds,
      failedLobbyIds,
    });
  },
);
