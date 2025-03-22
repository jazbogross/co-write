
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  scriptTitle: string;
  userId: string;
  content: any;
  versionName: string;
  githubAccessToken: string;
}

serve(async (req) => {
  console.log(`📌 Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("🔄 Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json() as RequestBody;
    console.log("✅ Request Body:", JSON.stringify({
      scriptId: body.scriptId,
      scriptTitle: body.scriptTitle,
      userId: body.userId,
      versionName: body.versionName,
      // Content omitted for brevity
    }, null, 2));

    const { scriptId, scriptTitle, userId, content, versionName, githubAccessToken } = body;

    if (!scriptId || !userId || !content || !versionName) {
      throw new Error('❌ Required fields missing');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get script details
    const { data: scriptData, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('folder_name, github_owner, github_repo')
      .eq('id', scriptId)
      .single();

    if (scriptError) {
      throw new Error(`❌ Failed to get script data: ${scriptError.message}`);
    }

    if (!scriptData.github_owner || !scriptData.github_repo) {
      throw new Error('❌ Script has no associated GitHub repository');
    }

    // Get user profile to check for main repo
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('github_main_repo, github_username')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`❌ Failed to get user profile: ${profileError.message}`);
    }

    const folderName = scriptData.folder_name || `${scriptTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${scriptId.substring(0, 8)}`;

    // Update script with folder name if not already set
    if (!scriptData.folder_name) {
      await supabaseClient
        .from('scripts')
        .update({ folder_name: folderName })
        .eq('id', scriptId);
    }

    // Initialize GitHub client
    console.log("🔐 Initializing GitHub client...");
    const octokit = new Octokit({
      auth: githubAccessToken
    });

    // Verify the token
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as GitHub user: ${githubUser.login}`);

    // Generate timestamp for version filename
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${
      String(now.getMonth() + 1).padStart(2, '0')
    }-${
      String(now.getDate()).padStart(2, '0')
    }-${
      String(now.getHours()).padStart(2, '0')
    }-${
      String(now.getMinutes()).padStart(2, '0')
    }-${
      String(now.getSeconds()).padStart(2, '0')
    }`;

    // Create version file
    const versionFileName = `${timestamp}.json`;
    
    // Ensure the versions directory exists
    try {
      await octokit.rest.repos.getContent({
        owner: userProfile.github_username || githubUser.login,
        repo: userProfile.github_main_repo || scriptData.github_repo,
        path: `${folderName}/versions`
      });
    } catch (error) {
      // Create the versions directory if it doesn't exist
      if (error.status === 404) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: userProfile.github_username || githubUser.login,
          repo: userProfile.github_main_repo || scriptData.github_repo,
          path: `${folderName}/versions/.gitkeep`,
          message: `Create versions directory for ${scriptTitle}`,
          content: Buffer.from('').toString('base64')
        });
      } else {
        throw error;
      }
    }

    // Save the version file
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const contentWithMetadata = JSON.stringify({
      version: versionName,
      created_at: now.toISOString(),
      content
    }, null, 2);

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: userProfile.github_username || githubUser.login,
      repo: userProfile.github_main_repo || scriptData.github_repo,
      path: `${folderName}/versions/${versionFileName}`,
      message: `Save version "${versionName}" of ${scriptTitle}`,
      content: Buffer.from(contentWithMetadata).toString('base64')
    });

    console.log(`✅ Version "${versionName}" saved to GitHub`);

    // Save to the database as well
    const { data: versionData, error: versionError } = await supabaseClient
      .from('script_versions')
      .insert({
        script_id: scriptId,
        version_number: 0, // Will be auto-incremented by trigger
        content_delta: content,
        created_by: userId,
        version_name: versionName
      })
      .select('id')
      .single();

    if (versionError) {
      console.error("❌ Error creating version record:", versionError);
      throw new Error(`Failed to save version to database: ${versionError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Version "${versionName}" saved successfully`,
        id: versionData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

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
