
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  newTitle: string;
  userId: string;
  githubAccessToken: string;
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

    const { scriptId, newTitle, userId, githubAccessToken } = await req.json() as RequestBody

    if (!scriptId || !newTitle || !userId || !githubAccessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get script data
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('github_repo, github_owner, folder_name, title, admin_id')
      .eq('id', scriptId)
      .single()

    if (scriptError || !script) {
      console.error('Error fetching script:', scriptError)
      return new Response(
        JSON.stringify({ error: 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin of the script
    if (script.admin_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Only the admin can rename a script' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the script title in the database
    const { error: updateError } = await supabaseClient
      .from('scripts')
      .update({ title: newTitle })
      .eq('id', scriptId)

    if (updateError) {
      console.error('Error updating script title:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update script title' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: githubAccessToken
    })

    // Only need to update README with the new title
    if (script.github_repo && script.github_owner && script.folder_name) {
      try {
        // Get the existing README content
        const { data: readmeFile } = await octokit.rest.repos.getContent({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${script.folder_name}/README.md`,
        })

        // Decode the current README content
        const readmeContent = atob(readmeFile.sha);
        
        // Get profile data for the admin
        const { data: adminProfile } = await supabaseClient
          .from('profiles')
          .select('username')
          .eq('id', script.admin_id)
          .single();
        
        const adminUsername = adminProfile?.username || 'unknown';
        
        // Get suggestion stats
        const { data: suggestions } = await supabaseClient
          .from('script_suggestions')
          .select('status, count')
          .eq('script_id', scriptId)
          .group('status');
        
        const totalSuggestions = suggestions ? suggestions.reduce((acc: number, item: any) => acc + parseInt(item.count), 0) : 0;
        const acceptedSuggestions = suggestions ? 
          suggestions.find((item: any) => item.status === 'approved')?.count || 0 : 0;

        // Create updated README with the new title
        const updatedReadme = 
          `# ${newTitle}\n\n` +
          `- **Admin:** ${adminUsername}\n` +
          `- **Created:** ${new Date().toLocaleDateString()}\n` +
          `- **Last Updated:** ${new Date().toLocaleDateString()}\n` +
          `- **Suggestions:** ${totalSuggestions}\n` +
          `- **Accepted Suggestions:** ${acceptedSuggestions}\n\n` +
          `This script was created with the Rewrite application.`;

        // Update the README file
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${script.folder_name}/README.md`,
          message: `Rename script: ${script.title} to ${newTitle}`,
          content: btoa(updatedReadme),
          sha: readmeFile.sha,
        })

        console.log('README updated with new title')
      } catch (error) {
        console.error('Error updating README:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update GitHub README' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, title: newTitle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in rename-script:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
