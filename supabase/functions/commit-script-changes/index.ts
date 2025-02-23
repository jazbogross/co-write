
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { scriptId, content } = await req.json() as RequestBody

    // Get script details
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('github_repo, github_owner, admin_id')
      .eq('id', scriptId)
      .single()

    if (scriptError || !script) {
      console.error('Error fetching script:', scriptError)
      return new Response(
        JSON.stringify({ error: 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: Deno.env.get('GITHUB_PAT')
    })

    // Get the current commit SHA of the main branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: 'heads/main'
    })

    // Get the current tree
    const { data: commit } = await octokit.rest.git.getCommit({
      owner: script.github_owner,
      repo: script.github_repo,
      commit_sha: ref.object.sha
    })

    // Create a new blob with the content
    const { data: blob } = await octokit.rest.git.createBlob({
      owner: script.github_owner,
      repo: script.github_repo,
      content: content,
      encoding: 'utf-8'
    })

    // Create a new tree
    const { data: tree } = await octokit.rest.git.createTree({
      owner: script.github_owner,
      repo: script.github_repo,
      base_tree: commit.tree.sha,
      tree: [{
        path: 'script.txt',
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      }]
    })

    // Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: script.github_owner,
      repo: script.github_repo,
      message: 'Update script content',
      tree: tree.sha,
      parents: [ref.object.sha]
    })

    // Update the reference
    await octokit.rest.git.updateRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: 'heads/main',
      sha: newCommit.sha
    })

    // Update script content in Supabase
    const { error: updateError } = await supabaseClient
      .from('scripts')
      .update({ content })
      .eq('id', scriptId)

    if (updateError) {
      console.error('Error updating script content:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, sha: newCommit.sha }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in commit-script-changes:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
