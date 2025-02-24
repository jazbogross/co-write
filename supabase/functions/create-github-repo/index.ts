
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
  githubAccessToken: string; // Now expecting OAuth token instead of installation ID
}

serve(async (req) => {
  console.log(`📌 Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("🔄 Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("📥 Parsing request body...");
    const body = await req.json() as RequestBody;
    console.log("✅ Request Body:", JSON.stringify(body, null, 2));

    const { scriptName, originalCreator, coAuthors, isPrivate, githubAccessToken } = body;

    if (!githubAccessToken) {
      throw new Error('❌ GitHub OAuth access token is required');
    }

    try {
      console.log("🔐 Initializing GitHub client with OAuth token...");
      const octokit = new Octokit({
        auth: githubAccessToken
      });

      // Verify the token by getting the authenticated user
      console.log("🔎 Verifying GitHub OAuth token...");
      const { data: user } = await octokit.rest.users.getAuthenticated();
      console.log(`✅ Authenticated as GitHub user: ${user.login}`);

      // Create a unique repository name
      const repoName = `script-${scriptName}-${Date.now()}`
      console.log(`📂 Creating repository: ${repoName}`);

      // Create the repository in the user's account
      const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: isPrivate,
        auto_init: true,
      });

      console.log(`✅ Repository created successfully: ${repo.html_url}`);

      // Wait for repository initialization
      console.log("⏳ Waiting 1 second for repository initialization...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create initial README content
      const readmeContent = `# ${scriptName}\n\nCreated by: ${originalCreator}\n${
        coAuthors.length ? `\nContributors:\n${coAuthors.map(author => `- ${author}`).join('\n')}` : ''
      }`;

      console.log("📝 Creating initial README...");
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: user.login,
        repo: repoName,
        path: 'README.md',
        message: 'Initial commit: Add README',
        content: btoa(readmeContent),
        branch: 'main'
      });

      console.log('🎉 Repository setup complete');

      return new Response(
        JSON.stringify({
          name: repoName,
          owner: user.login,
          html_url: repo.html_url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );

    } catch (error) {
      console.error("❌ Error in GitHub operations:", error);
      throw new Error(`GitHub operation failed: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
