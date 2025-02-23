import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/octokit@21.1.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  content: string;
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

    // Create a unique branch name
    const branchName = `suggestion-${crypto.randomUUID()}`

    // Get the current commit SHA of the main branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: 'heads/main'
    })

    // Create new branch from main
    await octokit.rest.git.createRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    })

    // Create a new blob with the content
    const { data: blob } = await octokit.rest.git.createBlob({
      owner: script.github_owner,
      repo: script.github_repo,
      content: content,
      encoding: 'utf-8'
    })

    // Get the current tree
    const { data: commit } = await octokit.rest.git.getCommit({
      owner: script.github_owner,
      repo: script.github_repo,
      commit_sha: ref.object.sha
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

    // Create a new commit on the new branch
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: script.github_owner,
      repo: script.github_repo,
      message: 'Suggested changes to script',
      tree: tree.sha,
      parents: [ref.object.sha]
    })

    // Update the branch reference
    await octokit.rest.git.updateRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha
    })

    // Create suggestion in database
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from('script_suggestions')
      .insert([{
        script_id: scriptId,
        content: content,
        branch_name: branchName,
        status: 'pending'
      }])
      .select()
      .single()

    if (suggestionError) {
      console.error('Error creating suggestion:', suggestionError)
      throw suggestionError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        branchName,
        suggestion 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-change-suggestion:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
