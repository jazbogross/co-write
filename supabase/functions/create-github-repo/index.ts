
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAppAuth } from "https://esm.sh/@octokit/auth-app@4.0.13"
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
  installationId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { scriptName, originalCreator, coAuthors, isPrivate, installationId } = await req.json() as RequestBody

    if (!installationId) {
      throw new Error('GitHub App installation ID is required')
    }

    const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");
    if (!privateKey) {
      throw new Error('GitHub App private key is not configured');
    }

    // Initialize authentication with the GitHub App
    const auth = createAppAuth({
      appId: Deno.env.get("GITHUB_APP_ID")!,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines in the private key
      installationId: installationId,
    });

    // Get an installation access token
    const installationAuthentication = await auth({ type: "installation" });
    
    const octokit = new Octokit({
      auth: installationAuthentication.token,
    });

    // Get the authenticated installation
    const { data: installation } = await octokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId),
    });

    if (!installation) {
      throw new Error('Could not find GitHub App installation')
    }

    // Create a unique repository name
    const repoName = `script-${scriptName}-${Date.now()}`

    console.log('Creating repository:', { repoName });

    // Create the repository
    const { data: repo } = await octokit.rest.repos.createInOrg({
      org: installation.account.login,
      name: repoName,
      private: isPrivate,
      auto_init: true,
    })

    // Wait a moment for the repository to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create initial README content
    const readmeContent = `# ${scriptName}\n\nCreated by: ${originalCreator}\n${
      coAuthors.length ? `\nContributors:\n${coAuthors.map(author => `- ${author}`).join('\n')}` : ''
    }`

    // Update README with new content
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: installation.account.login,
        repo: repoName,
        path: 'README.md',
      });

      if ('sha' in existingFile) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: installation.account.login,
          repo: repoName,
          path: 'README.md',
          message: 'Update README',
          content: btoa(readmeContent),
          sha: existingFile.sha,
          branch: 'main'
        });
      }
    } catch (error) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: installation.account.login,
        repo: repoName,
        path: 'README.md',
        message: 'Initial commit: Add README',
        content: btoa(readmeContent),
        branch: 'main'
      });
    }

    console.log('Repository created successfully:', {
      name: repoName,
      owner: installation.account.login,
      html_url: repo.html_url
    })

    return new Response(
      JSON.stringify({
        name: repoName,
        owner: installation.account.login,
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
