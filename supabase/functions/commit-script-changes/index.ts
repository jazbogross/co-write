
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  content: string;
  githubAccessToken: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    let { scriptId, content, githubAccessToken } = await req.json() as RequestBody

    // Validate GitHub OAuth token
    if (!githubAccessToken) {
      throw new Error('❌ GitHub OAuth access token is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get script details from Supabase
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('github_repo, github_owner, admin_id, title')
      .eq('id', scriptId)
      .single()

    if (scriptError || !script) {
      console.error('Error fetching script:', scriptError)
      return new Response(
        JSON.stringify({ error: 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate GitHub repository details
    if (!script.github_owner || !script.github_repo) {
      console.error('Missing GitHub repository details:', { script })
      return new Response(
        JSON.stringify({ 
          error: 'Invalid GitHub repository configuration',
          details: 'Missing repository owner or name'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch script content from database
    const { data: contentData, error: contentError } = await supabaseClient
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle()

    // If content doesn't exist yet, create a default empty content entry
    if (!contentData || contentError) {
      console.log('No content found, creating default empty content')
      
      // Create default content
      const defaultContent = JSON.stringify({ 
        ops: [{ insert: `# ${script.title || 'Untitled Script'}\n\nContent has not been saved yet.\n` }] 
      })
      
      // Save default content to database
      const { error: createError } = await supabaseClient
        .from('script_content')
        .insert({
          script_id: scriptId,
          content_delta: { ops: [{ insert: `# ${script.title || 'Untitled Script'}\n\nContent has not been saved yet.\n` }] },
          version: 1
        })
      
      if (createError) {
        console.error('Error creating default content:', createError)
      }
      
      // Use default content for GitHub commit
      content = defaultContent
    }

    // Initialize Octokit using the provided GitHub OAuth access token
    const octokit = new Octokit({
      auth: githubAccessToken
    })

    try {
      // Get the current commit SHA of the main branch
      const { data: ref } = await octokit.rest.git.getRef({
        owner: script.github_owner,
        repo: script.github_repo,
        ref: 'heads/main'
      })

      // Get the current commit details
      const { data: commit } = await octokit.rest.git.getCommit({
        owner: script.github_owner,
        repo: script.github_repo,
        commit_sha: ref.object.sha
      })

      // Create a new blob with the updated content
      const { data: blob } = await octokit.rest.git.createBlob({
        owner: script.github_owner,
        repo: script.github_repo,
        content: content,
        encoding: 'utf-8'
      })

      // Create a new tree containing the updated file
      const { data: tree } = await octokit.rest.git.createTree({
        owner: script.github_owner,
        repo: script.github_repo,
        base_tree: commit.tree.sha,
        tree: [{
          path: 'script.json', // Changed from script.txt to script.json
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        }]
      })

      // Create a new commit with the new tree
      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner: script.github_owner,
        repo: script.github_repo,
        message: 'Update script content with formatted JSON',
        tree: tree.sha,
        parents: [ref.object.sha]
      })

      // Update the reference for the main branch
      await octokit.rest.git.updateRef({
        owner: script.github_owner,
        repo: script.github_repo,
        ref: 'heads/main',
        sha: newCommit.sha
      })

      // Log success information
      console.log('Successfully committed JSON content to GitHub', {
        repo: `${script.github_owner}/${script.github_repo}`,
        commit: newCommit.sha
      })

      return new Response(
        JSON.stringify({ success: true, sha: newCommit.sha }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (githubError) {
      console.error('GitHub API error:', githubError)
      return new Response(
        JSON.stringify({ 
          error: 'GitHub operation failed',
          details: githubError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in commit-script-changes:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
