
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  userId: string;
  githubAccessToken: string;
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

    const { userId, githubAccessToken } = body;

    if (!githubAccessToken) {
      throw new Error('❌ GitHub OAuth access token is required');
    }

    if (!userId) {
      throw new Error('❌ User ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      console.log("🔐 Initializing GitHub client with OAuth token...");
      const octokit = new Octokit({
        auth: githubAccessToken
      });

      // Verify the token by getting the authenticated user
      console.log("🔎 Verifying GitHub OAuth token...");
      const { data: user } = await octokit.rest.users.getAuthenticated();
      console.log(`✅ Authenticated as GitHub user: ${user.login}`);

      // Create a unique repository name with date format
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      const repoName = `rewrite-scripts-${day}-${month}-${year}`
      console.log(`📂 Creating repository: ${repoName}`);

      // Check if repo already exists
      try {
        await octokit.rest.repos.get({
          owner: user.login,
          repo: repoName
        });
        console.log(`✅ Repository already exists: ${repoName}`);
      } catch (error) {
        // If error, repo doesn't exist, so create it
        if (error.status === 404) {
          // Create the repository in the user's account
          await octokit.rest.repos.createForAuthenticatedUser({
            name: repoName,
            private: false,
            auto_init: true,
            description: 'Repository for storing script projects created with the Rewrite application'
          });
          console.log(`✅ Repository created successfully: ${repoName}`);
        } else {
          throw error;
        }
      }

      // Update the user's profile with the repo details
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          github_main_repo: repoName,
          github_username: user.login,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error("❌ Error updating profile:", profileError);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      console.log('🎉 Repository setup complete');

      return new Response(
        JSON.stringify({
          name: repoName,
          owner: user.login,
          success: true
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
