
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  content: string;
  versionName: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { scriptId, content, versionName, userId } = await req.json() as RequestBody

    if (!scriptId || !content || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse content to ensure it's valid JSON
    let contentObject;
    try {
      contentObject = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid content format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get script data
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('admin_id, github_repo, github_owner, folder_name')
      .eq('id', scriptId)
      .single()

    if (scriptError || !script) {
      console.error('Error fetching script:', scriptError)
      return new Response(
        JSON.stringify({ error: 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    if (script.admin_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Only the admin can save versions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the current version number
    const { data: versionData, error: versionError } = await supabaseClient
      .from('script_versions')
      .select('version_number')
      .eq('script_id', scriptId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const nextVersionNumber = versionData ? versionData.version_number + 1 : 1;
    
    // Create a new version record
    const { error: createError } = await supabaseClient
      .from('script_versions')
      .insert({
        script_id: scriptId,
        content_delta: contentObject,
        created_by: userId,
        version_number: nextVersionNumber,
        version_name: versionName || `Version ${nextVersionNumber}`
      });
    
    if (createError) {
      console.error('Error creating version record:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to save version' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get GitHub token to save version file
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('github_access_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.github_access_token) {
      console.error('Error getting GitHub token:', profileError);
      return new Response(
        JSON.stringify({ error: 'GitHub token not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save the version to GitHub
    const { data: githubResult, error: githubError } = await supabaseClient.functions.invoke('commit-script-changes', {
      body: {
        scriptId,
        content: JSON.stringify(contentObject),
        githubAccessToken: profile.github_access_token,
        isVersion: true,
        versionName,
        userId
      }
    });

    if (githubError) {
      console.error('Error saving version to GitHub:', githubError);
      // Don't fail the operation if GitHub save fails, as we already saved to the database
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        versionNumber: nextVersionNumber,
        versionName: versionName || `Version ${nextVersionNumber}`,
        githubResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in save-script-version:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
