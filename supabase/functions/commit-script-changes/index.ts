
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  scriptTitle?: string;
  content: string;
  githubAccessToken: string;
  versionName?: string;
  versionFileName?: string;
  saveAsVersion?: boolean;
}

serve(async (req) => {
  console.log(`📌 Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("🔄 Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body = await req.json() as RequestBody;
    console.log("✅ Request payload received with fields:", Object.keys(body).join(", "));

    // Validate required fields
    const { scriptId, content, githubAccessToken, versionName, versionFileName, saveAsVersion } = body;
    
    if (!scriptId || !content || !githubAccessToken) {
      console.error("❌ Missing required fields");
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get script details
    console.log("🔍 Fetching script details for scriptId:", scriptId);
    const { data: scriptData, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('title, github_owner, github_repo, folder_name')
      .eq('id', scriptId)
      .single();

    if (scriptError) {
      console.error("❌ Failed to get script data:", scriptError.message);
      return new Response(
        JSON.stringify({ error: `Failed to get script data: ${scriptError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!scriptData.github_owner || !scriptData.github_repo) {
      console.error("❌ Script has no associated GitHub repository");
      return new Response(
        JSON.stringify({ error: 'Script has no associated GitHub repository' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`✅ Script details retrieved: ${scriptData.title}, repo: ${scriptData.github_owner}/${scriptData.github_repo}`);

    // Initialize GitHub client
    console.log("🔐 Initializing GitHub client...");
    const octokit = new Octokit({
      auth: githubAccessToken
    });

    try {
      // Verify the token by getting authenticated user
      const { data: githubUser } = await octokit.rest.users.getAuthenticated();
      console.log(`✅ Authenticated as GitHub user: ${githubUser.login}`);
    } catch (authError) {
      console.error("❌ GitHub authentication failed:", authError.message);
      return new Response(
        JSON.stringify({ error: 'GitHub authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Determine folder name for consistency
    const folderName = scriptData.folder_name || 
      `${(scriptData.title || body.scriptTitle || 'script')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()}-${scriptId.substring(0, 8)}`;

    // If folder name wasn't set yet, update it
    if (!scriptData.folder_name) {
      console.log(`📝 Updating script with folder name: ${folderName}`);
      await supabaseClient
        .from('scripts')
        .update({ folder_name: folderName })
        .eq('id', scriptId);
    }

    // Handle saving a version to GitHub
    if (saveAsVersion && versionName) {
      console.log(`🔖 Saving version "${versionName}" to GitHub...`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = versionFileName || `${timestamp}.json`;
      const versionsPath = `${folderName}/versions`;
      
      try {
        // First, ensure the versions directory exists
        try {
          await octokit.rest.repos.getContent({
            owner: scriptData.github_owner,
            repo: scriptData.github_repo,
            path: versionsPath,
          });
          console.log(`✅ Versions directory exists: ${versionsPath}`);
        } catch (error) {
          if (error.status === 404) {
            console.log(`📁 Creating versions directory: ${versionsPath}`);
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: scriptData.github_owner,
              repo: scriptData.github_repo,
              path: `${versionsPath}/.gitkeep`,
              message: `Create versions directory for ${scriptData.title}`,
              content: btoa('')
            });
          } else {
            throw error;
          }
        }
        
        // Create the version metadata object
        const versionMetadata = {
          version_name: versionName,
          created_at: new Date().toISOString(),
          content: JSON.parse(content)
        };
        
        // Save the version file
        console.log(`💾 Saving version file: ${versionsPath}/${fileName}`);
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: scriptData.github_owner,
          repo: scriptData.github_repo,
          path: `${versionsPath}/${fileName}`,
          message: `Save version "${versionName}" of ${scriptData.title}`,
          content: btoa(JSON.stringify(versionMetadata, null, 2))
        });
        
        console.log(`✅ Version file saved successfully`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Version "${versionName}" saved successfully`,
            version_path: `${versionsPath}/${fileName}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (versionError) {
        console.error(`❌ Error saving version:`, versionError);
        return new Response(
          JSON.stringify({ error: `Failed to save version: ${versionError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Regular content commit
    try {
      console.log(`💾 Updating script content in GitHub...`);
      
      // Save main script content
      const contentPath = `${folderName}/script-latest.json`;
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: scriptData.github_owner,
        repo: scriptData.github_repo,
        path: contentPath,
        message: `Update content for ${scriptData.title}`,
        content: btoa(content),
        sha: await getSHA(octokit, scriptData.github_owner, scriptData.github_repo, contentPath)
      });
      
      console.log(`✅ Content committed successfully`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Content committed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (commitError) {
      console.error(`❌ Error committing content:`, commitError);
      return new Response(
        JSON.stringify({ error: `Failed to commit content: ${commitError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to get the SHA of an existing file (needed for updates)
async function getSHA(octokit: any, owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    });
    return data.sha;
  } catch (error) {
    // File doesn't exist yet
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Helper function to Base64 encode strings in Deno (replacing Buffer)
function btoa(str: string): string {
  // Convert the string to an ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Convert the ArrayBuffer to a base64 string
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

