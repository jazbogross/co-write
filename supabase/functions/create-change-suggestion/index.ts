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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get the request body
    const { scriptId, content } = await req.json() as RequestBody

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) throw new Error('Error getting user')

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      throw new Error('Error getting user profile')
    }

    // Get script details
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('github_repo, github_owner, content')
      .eq('id', scriptId)
      .single()

    if (scriptError || !script) {
      throw new Error('Error getting script')
    }

    // Create a unique branch name for this suggestion
    const branchName = `suggestion-${crypto.randomUUID()}`

    // Try to get the session to check for a GitHub OAuth token
    const { data: { session } } = await supabaseClient.auth.getSession()
    const githubToken = session?.provider_token ?? Deno.env.get('GITHUB_PAT')

    // Initialize GitHub client with the appropriate token
    const octokit = new Octokit({
      auth: githubToken
    })

    // Find the first line number that differs between the original and new content
    const originalLines = script.content.split('\n')
    const newLines = content.split('\n')
    let firstChangedLine = 1
    for (let i = 0; i < Math.min(originalLines.length, newLines.length); i++) {
      if (originalLines[i] !== newLines[i]) {
        firstChangedLine = i + 1
        break
      }
    }

    // Get the current commit SHA of the main branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: 'heads/main'
    })

    // Create new branch for the suggestion
    await octokit.rest.git.createRef({
      owner: script.github_owner,
      repo: script.github_repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    })

    // Get the current file to retrieve its SHA
    const { data: file } = await octokit.rest.repos.getContent({
      owner: script.github_owner,
      repo: script.github_repo,
      path: 'script.txt',
      ref: 'main'
    })

    if (!('sha' in file)) {
      throw new Error('Could not get file SHA')
    }

    // Update the file in the new branch with the suggested content
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: script.github_owner,
      repo: script.github_repo,
      path: 'script.txt',
      message: `${profile.username} suggested a change on line ${firstChangedLine} (${profile.email})`,
      content: btoa(content),
      branch: branchName,
      sha: file.sha
    })

    // Create the suggestion record in the database
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from('script_suggestions')
      .insert([{
        script_id: scriptId,
        user_id: user.id,
        content: content,
        branch_name: branchName,
        status: 'pending'
      }])
      .select()
      .single()

    if (suggestionError) {
      throw suggestionError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestion,
        branchName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating suggestion:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
