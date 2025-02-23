
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptName: string;
  originalCreator: string;
  coAuthors: string[];
  isPrivate: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { scriptName, originalCreator, coAuthors, isPrivate } = await req.json() as RequestBody

    const githubToken = Deno.env.get('GITHUB_PAT')
    if (!githubToken) {
      throw new Error('GitHub token not configured')
    }

    const octokit = new Octokit({
      auth: githubToken
    })

    // First, get the authenticated user's info
    const { data: user } = await octokit.rest.users.getAuthenticated()
    const owner = user.login

    if (!owner) {
      throw new Error('Could not determine GitHub user')
    }

    // Create a unique repository name
    const repoName = `script-${scriptName}-${Date.now()}`

    console.log('Creating repository:', { owner, repoName });

    // Create the repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      auto_init: true, // This creates a default README.md
    })

    // Wait a moment for the repository to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the main branch reference
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
    })

    // Get the commit SHA that the reference points to
    const commitSha = ref.object.sha

    // Create initial README content
    const readmeContent = `# ${scriptName}\n\nCreated by: ${originalCreator}\n${
      coAuthors.length ? `\nContributors:\n${coAuthors.map(author => `- ${author}`).join('\n')}` : ''
    }`

    // Get the current README.md if it exists
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo: repoName,
        path: 'README.md',
      });

      // Update README with new content
      if ('sha' in existingFile) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: 'README.md',
          message: 'Update README',
          content: btoa(readmeContent),
          sha: existingFile.sha,
          branch: 'main'
        });
      }
    } catch (error) {
      // If the file doesn't exist, create it
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: 'README.md',
        message: 'Initial commit: Add README',
        content: btoa(readmeContent),
        branch: 'main'
      });
    }

    console.log('Repository created successfully:', {
      name: repoName,
      owner: owner,
      html_url: repo.html_url
    })

    return new Response(
      JSON.stringify({
        name: repoName,
        owner: owner,
        html_url: repo.html_url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
