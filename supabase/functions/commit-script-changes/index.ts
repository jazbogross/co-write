
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
  versionName?: string;
  saveAsVersion?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    let { scriptId, content, githubAccessToken, versionName, saveAsVersion } = await req.json() as RequestBody

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
      .select(`
        id, 
        title, 
        github_repo, 
        github_owner, 
        admin_id, 
        profiles:admin_id(username)
      `)
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

      // Get the folder name for this script
      const folderName = `${script.title.replace(/\s+/g, '-')}_${scriptId.substring(0, 8)}`
      
      // Determine the file path based on whether this is a version or the latest script
      let filePath = `${folderName}/script-latest.json`
      let commitMessage = 'Update script content'

      if (saveAsVersion) {
        // For versions, use a timestamp-based filename
        const now = new Date()
        const timestamp = [
          now.getFullYear(),
          (now.getMonth() + 1).toString().padStart(2, '0'),
          now.getDate().toString().padStart(2, '0'),
          now.getHours().toString().padStart(2, '0'),
          now.getMinutes().toString().padStart(2, '0'),
          now.getSeconds().toString().padStart(2, '0')
        ].join('-')
        
        filePath = `${folderName}/versions/${timestamp}.json`
        commitMessage = `Save version: ${versionName || timestamp}`
      }

      // Get statistics for README update
      let coAuthors = []
      let totalSuggestions = 0
      let acceptedSuggestions = 0

      // Fetch suggestions stats
      const { data: suggestions } = await supabaseClient
        .from('script_suggestions')
        .select('id, status, user_id, profiles:user_id(username)')
        .eq('script_id', scriptId)
      
      if (suggestions) {
        // Count suggestions
        totalSuggestions = suggestions.length
        acceptedSuggestions = suggestions.filter(s => s.status === 'approved').length
        
        // Get unique co-authors (users who made suggestions)
        coAuthors = [...new Set(
          suggestions
            .filter(s => s.profiles?.username && s.user_id !== script.admin_id)
            .map(s => s.profiles.username)
        )]
      }

      // Create a new blob with the updated content
      const { data: contentBlob } = await octokit.rest.git.createBlob({
        owner: script.github_owner,
        repo: script.github_repo,
        content: content,
        encoding: 'utf-8'
      })

      // Prepare the README content
      const readmeContent = `# ${script.title}

## Information
- **Admin**: ${script.profiles?.username || 'Unknown'}
${coAuthors.length ? `- **Co-Authors**: ${coAuthors.join(', ')}` : ''}
- **Created**: ${new Date(script.created_at || Date.now()).toLocaleDateString()}
- **Last Updated**: ${new Date().toLocaleDateString()}
- **Suggestions**: ${totalSuggestions} (${acceptedSuggestions} accepted)

## Description
This script is managed by the Rewrite Scripts application.
`

      // Create a blob for the README
      const { data: readmeBlob } = await octokit.rest.git.createBlob({
        owner: script.github_owner,
        repo: script.github_repo,
        content: readmeContent,
        encoding: 'utf-8'
      })

      // Create tree entries for both files
      const treeEntries = [
        {
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: contentBlob.sha
        }
      ]
      
      // Only update README for main content updates, not for versions
      if (!saveAsVersion) {
        treeEntries.push({
          path: `${folderName}/README.md`,
          mode: '100644',
          type: 'blob',
          sha: readmeBlob.sha
        })
      }

      // Create a new tree containing the updated files
      const { data: tree } = await octokit.rest.git.createTree({
        owner: script.github_owner,
        repo: script.github_repo,
        base_tree: commit.tree.sha,
        tree: treeEntries
      })

      // Create a new commit with the new tree
      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner: script.github_owner,
        repo: script.github_repo,
        message: commitMessage,
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
      console.log('Successfully committed content to GitHub', {
        repo: `${script.github_owner}/${script.github_repo}`,
        commit: newCommit.sha,
        filePath
      })

      // Update script version in database if needed
      if (!saveAsVersion) {
        // Get current version and increment
        const { data: scriptContent } = await supabaseClient
          .from('script_content')
          .select('version')
          .eq('script_id', scriptId)
          .single()
          
        const newVersion = (scriptContent?.version || 0) + 1
        
        await supabaseClient
          .from('script_content')
          .update({ 
            version: newVersion,
            updated_at: new Date().toISOString() 
          })
          .eq('script_id', scriptId)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sha: newCommit.sha,
          filePath,
          isVersion: saveAsVersion
        }),
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
