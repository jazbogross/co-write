import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/@octokit/rest'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define interfaces for request and data
interface RequestBody {
  scriptId: string;
  content: string;
  githubAccessToken: string;
  scriptFolderName?: string;
  readmeContent?: string;
  createFolderStructure?: boolean;
  isVersion?: boolean;
  versionName?: string;
  userId?: string;
}

interface ScriptData {
  id: string;
  title: string;
  github_repo: string;
  github_owner: string;
  admin_id: string;
  updated_at: string;
  folder_name?: string;
}

interface SuggestionStats {
  total: number;
  accepted: number;
}

// Helper: UTF-8 safe base64 encoding
function base64Encode(str: string): string {
  try {
    const uint8Array = new TextEncoder().encode(str);
    let binary = '';
    uint8Array.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary);
  } catch (error) {
    console.error("Error in base64Encode:", error);
    throw error;
  }
}

serve(async (req) => {
  console.log("----- Function commit-script-changes started -----");

  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received, returning early");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    console.log("Creating Supabase client");
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log("Supabase client created");

    // Parse request JSON
    let requestData: RequestBody;
    try {
      requestData = await req.json() as RequestBody;
      console.log("Request data parsed successfully", requestData);
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      return new Response(
        JSON.stringify({ error: `Failed to parse request JSON: ${jsonError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      scriptId,
      content,
      githubAccessToken,
      scriptFolderName,
      readmeContent,
      createFolderStructure = false,
      isVersion = false,
      versionName = '',
      userId
    } = requestData;

    console.log(`Received parameters: scriptId=${scriptId}, hasToken=${!!githubAccessToken}, createFolderStructure=${createFolderStructure}, isVersion=${isVersion}`);

    if (!scriptId || !githubAccessToken) {
      console.error("Missing required parameters:", { hasScriptId: !!scriptId, hasGithubToken: !!githubAccessToken });
      return new Response(
        JSON.stringify({ error: 'Script ID and GitHub access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch script data from DB
    console.log("Fetching script data from DB for scriptId:", scriptId);
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('id, title, github_repo, github_owner, admin_id, updated_at, folder_name')
      .eq('id', scriptId)
      .single() as { data: ScriptData | null, error: any };

    if (scriptError || !script) {
      console.error("Error fetching script:", scriptError?.message || "Script not found");
      return new Response(
        JSON.stringify({ error: scriptError?.message || 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log("Script data fetched:", {
      title: script.title,
      repo: script.github_repo,
      owner: script.github_owner,
      folder_name: script.folder_name
    });

    // Get admin profile for README
    console.log("Fetching admin profile for admin_id:", script.admin_id);
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', script.admin_id)
      .single();
    const adminUsername = adminProfile?.username || 'unknown';
    console.log("Admin username:", adminUsername);

    // Get suggestion stats for README
    console.log("Fetching suggestion stats for script:", scriptId);
    const { data: suggestions } = await supabaseClient
      .from('script_suggestions')
      .select('status, count')
      .eq('script_id', scriptId)
      .group('status');
    const suggestionStats: SuggestionStats = {
      total: 0,
      accepted: 0
    };
    if (suggestions) {
      suggestions.forEach((item: any) => {
        if (item.status === 'approved') {
          suggestionStats.accepted = parseInt(item.count);
        }
        suggestionStats.total += parseInt(item.count);
      });
    }
    console.log("Suggestion stats computed:", suggestionStats);

    // Initialize GitHub API client
    console.log("Initializing GitHub API client");
    let octokit: Octokit;
    try {
      octokit = new Octokit({
        auth: githubAccessToken
      });
      console.log("GitHub API client initialized");
    } catch (githubInitError) {
      console.error("Error initializing GitHub API client:", githubInitError);
      return new Response(
        JSON.stringify({ error: `Failed to initialize GitHub client: ${githubInitError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify repository exists
    console.log(`Verifying repository: ${script.github_owner}/${script.github_repo}`);
    try {
      await octokit.rest.repos.get({
        owner: script.github_owner,
        repo: script.github_repo
      });
      console.log("Repository verified successfully");
    } catch (repoError: any) {
      console.error("Error verifying repository:", repoError);
      if (repoError.status === 404) {
        return new Response(
          JSON.stringify({ error: `Repository ${script.github_owner}/${script.github_repo} not found. Please ensure it exists.` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Error accessing repository: ${repoError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine folder name to use
    const folderName = scriptFolderName || script.folder_name || `${script.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().substring(7)}`;
    console.log("Using folder name:", folderName);

    // Update script record with folder name if not present
    if (!script.folder_name) {
      console.log("Updating script record with folder name");
      await supabaseClient
        .from('scripts')
        .update({ folder_name: folderName })
        .eq('id', scriptId);
      console.log("Script record updated with new folder name");
    }

    if (createFolderStructure) {
      console.log("createFolderStructure flag is true: creating initial folder structure");

      try {
        // Check if the folder already exists
        console.log(`Checking if folder ${folderName} exists in repository`);
        try {
          await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: folderName
          });
          console.log(`Folder ${folderName} already exists`);
        } catch (error: any) {
          if (error.status === 404) {
            // Create the folder with a placeholder file
            console.log("Folder not found; creating main folder with .gitkeep");
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/.gitkeep`,
              message: "Initialize script folder",
              content: base64Encode(""),
            });
            console.log(`Created folder ${folderName} with .gitkeep`);
          } else {
            console.error("Unexpected error checking folder existence:", error);
            throw error;
          }
        }

        // Create versions folder
        console.log(`Checking if versions folder exists at ${folderName}/versions`);
        try {
          await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/versions`
          });
          console.log(`Versions folder already exists`);
        } catch (error: any) {
          if (error.status === 404) {
            console.log("Versions folder not found; creating it with .gitkeep");
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/versions/.gitkeep`,
              message: "Initialize versions folder",
              content: base64Encode(""),
            });
            console.log("Created versions folder with .gitkeep");
          } else {
            console.error("Unexpected error checking versions folder:", error);
            throw error;
          }
        }

        // Create initial README.md if provided
        if (readmeContent) {
          console.log("Creating initial README.md");
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
            message: "Initialize README for script",
            content: base64Encode(readmeContent),
          });
          console.log("Created README.md");
        }

        // Create initial script-latest.json file
        console.log("Creating initial script-latest.json file");
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
          message: "Initialize script content",
          content: base64Encode(content),
        });
        console.log("Created script-latest.json");

      } catch (error: any) {
        console.error("Error creating folder structure:", error);
        return new Response(
          JSON.stringify({ 
            error: `Error creating folder structure: ${error.message}`,
            details: error.stack || 'No stack trace available'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (isVersion) {
      console.log("isVersion flag is true: saving as a version file");
      // Save as a version file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
      const versionFileName = versionName ? 
        `${versionName.replace(/\s+/g, '-')}-${timestamp}.json` : 
        `version-${timestamp}.json`;
      
      try {
        console.log("Creating version file:", versionFileName);
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/versions/${versionFileName}`,
          message: `Save version: ${versionName || timestamp}`,
          content: base64Encode(content),
        });
        console.log("Version file created:", versionFileName);
        
        // Store the version in the database if userId is provided
        if (userId) {
          console.log("Storing version data in database for user:", userId);
          const { data: versionData } = await supabaseClient
            .from('script_versions')
            .select('version_number')
            .eq('script_id', scriptId)
            .order('version_number', { ascending: false })
            .limit(1);
          
          const nextVersionNumber = versionData && versionData.length > 0 ? versionData[0].version_number + 1 : 1;
          console.log("Next version number:", nextVersionNumber);
          
          await supabaseClient
            .from('script_versions')
            .insert({
              script_id: scriptId,
              content_delta: JSON.parse(content),
              created_by: userId,
              version_number: nextVersionNumber,
              version_name: versionName || `Version ${nextVersionNumber}`,
              created_at: new Date().toISOString()
            });
          console.log("Version record inserted in database");
        }
      } catch (error: any) {
        console.error("Error saving version:", error);
        return new Response(
          JSON.stringify({ error: `Error saving version: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log("Updating existing script content");
      try {
        // Update script-latest.json
        console.log("Fetching current script-latest.json to obtain sha");
        const contentFile = await octokit.rest.repos.getContent({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
        }).catch(() => null);
        console.log("Fetched script-latest.json file details:", contentFile?.data?.sha);

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
          message: `Update script content`,
          content: base64Encode(content),
          sha: contentFile?.data?.sha,
        });
        console.log("Updated script-latest.json");

        // Update README.md with latest stats
        console.log("Attempting to update README.md with latest stats");
        try {
          const readmeFile = await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
          });
          console.log("Fetched README.md details:", readmeFile.data.sha);

          const updatedReadme = 
            `# ${script.title}\n\n` +
            `- **Admin:** ${adminUsername}\n` +
            `- **Created:** ${new Date(script.updated_at).toLocaleDateString()}\n` +
            `- **Last Updated:** ${new Date().toLocaleDateString()}\n` +
            `- **Suggestions:** ${suggestionStats.total}\n` +
            `- **Accepted Suggestions:** ${suggestionStats.accepted}\n\n` +
            `This script was created with the Rewrite application.`;
          console.log("Constructed updated README.md content");

          await octokit.rest.repos.createOrUpdateFileContents({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
            message: `Update README`,
            content: base64Encode(updatedReadme),
            sha: readmeFile.data.sha,
          });
          console.log("Updated README.md successfully");
        } catch (error) {
          console.error("Error updating README.md:", error);
          // Continue even if README update fails
        }
      } catch (error: any) {
        console.error("Error updating script content:", error);
        return new Response(
          JSON.stringify({ error: `Error updating content: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log("Operation completed successfully");
    return new Response(
      JSON.stringify({ 
        success: true, 
        folderName: folderName,
        message: isVersion ? "Version saved successfully" : "Changes committed successfully" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unhandled error in commit-script-changes:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack || 'No stack trace available',
        name: error.name || 'Unknown error type'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
