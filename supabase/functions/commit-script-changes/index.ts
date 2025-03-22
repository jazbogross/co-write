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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Start logging key events for debugging
    console.log("commit-script-changes function started");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log("Supabase client created");

    let requestData;
    try {
      requestData = await req.json() as RequestBody;
      console.log("Request data parsed successfully");
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

    console.log(`Request parameters received: scriptId=${scriptId}, hasToken=${!!githubAccessToken}, createFolder=${createFolderStructure}`);

    if (!scriptId || !githubAccessToken) {
      console.error("Missing required parameters:", { hasScriptId: !!scriptId, hasGithubToken: !!githubAccessToken });
      return new Response(
        JSON.stringify({ error: 'Script ID and GitHub access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get script data
    console.log("Fetching script data from DB");
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
      )
    }

    console.log("Script data fetched successfully:", {
      title: script.title,
      repo: script.github_repo,
      owner: script.github_owner
    });

    // Get admin profile for README
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', script.admin_id)
      .single();
    
    const adminUsername = adminProfile?.username || 'unknown';
    
    // Get suggestion stats for README
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

    // Initialize GitHub API client
    console.log("Initializing GitHub API client");
    try {
      var octokit = new Octokit({
        auth: githubAccessToken
      });
      console.log("GitHub API client initialized successfully");
    } catch (githubInitError) {
      console.error("Error initializing GitHub API client:", githubInitError);
      return new Response(
        JSON.stringify({ error: `Failed to initialize GitHub client: ${githubInitError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify repository exists
    try {
      console.log(`Verifying repository exists: ${script.github_owner}/${script.github_repo}`);
      await octokit.rest.repos.get({
        owner: script.github_owner,
        repo: script.github_repo
      });
      console.log("Repository verification successful");
    } catch (repoError) {
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

    // Get or create folder name
    const folderName = scriptFolderName || script.folder_name || `${script.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().substring(7)}`;
    console.log(`Using folder name: ${folderName}`);
    
    // If script doesn't have a folder_name yet, update it
    if (!script.folder_name) {
      console.log("Updating script record with folder name");
      await supabaseClient
        .from('scripts')
        .update({ folder_name: folderName })
        .eq('id', scriptId);
    }

    if (createFolderStructure) {
      console.log("Creating initial folder structure");

      try {
        // Check if the folder already exists
        try {
          await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: folderName
          });
          console.log(`Folder ${folderName} already exists`);
        } catch (error) {
          if (error.status === 404) {
            // Create the folder with a placeholder file
            console.log("Creating main folder");
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/.gitkeep`,
              message: "Initialize script folder",
              content: btoa(""),
            });
            console.log(`Created folder ${folderName}`);
          } else {
            console.error("Unexpected error checking folder:", error);
            throw error;
          }
        }

        // Create versions folder
        try {
          await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/versions`
          });
          console.log(`Versions folder already exists`);
        } catch (error) {
          if (error.status === 404) {
            // Create the versions folder with a placeholder file
            console.log("Creating versions subfolder");
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/versions/.gitkeep`,
              message: "Initialize versions folder",
              content: btoa(""),
            });
            console.log(`Created versions folder`);
          } else {
            console.error("Unexpected error checking versions folder:", error);
            throw error;
          }
        }

        // Create initial README.md
        if (readmeContent) {
          console.log("Creating README.md");
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
            message: "Initialize README for script",
            content: btoa(readmeContent),
          });
          console.log(`Created README.md`);
        }

        // Create initial script-latest.json
        console.log("Creating script-latest.json");
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
          message: "Initialize script content",
          content: btoa(content),
        });
        console.log(`Created script-latest.json`);

      } catch (error) {
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
      // Save as a version file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
      const versionFileName = versionName ? 
        `${versionName.replace(/\s+/g, '-')}-${timestamp}.json` : 
        `version-${timestamp}.json`;
      
      try {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/versions/${versionFileName}`,
          message: `Save version: ${versionName || timestamp}`,
          content: btoa(content),
        });
        console.log(`Created version file: ${versionFileName}`);
        
        // Store the version in the database
        if (userId) {
          // Get the next version number
          const { data: versionData } = await supabaseClient
            .from('script_versions')
            .select('version_number')
            .eq('script_id', scriptId)
            .order('version_number', { ascending: false })
            .limit(1);
          
          const nextVersionNumber = versionData && versionData.length > 0 ? versionData[0].version_number + 1 : 1;
          
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
        }
      } catch (error) {
        console.error("Error saving version:", error);
        return new Response(
          JSON.stringify({ error: `Error saving version: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Update existing script content
      try {
        // Update script-latest.json
        const contentFile = await octokit.rest.repos.getContent({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
        }).catch(() => null);

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: script.github_owner,
          repo: script.github_repo,
          path: `${folderName}/script-latest.json`,
          message: `Update script content`,
          content: btoa(content),
          sha: contentFile?.data?.sha,
        });
        console.log(`Updated script-latest.json`);

        // Update README.md with latest stats
        try {
          const readmeFile = await octokit.rest.repos.getContent({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
          });

          // Create updated README
          const updatedReadme = 
            `# ${script.title}\n\n` +
            `- **Admin:** ${adminUsername}\n` +
            `- **Created:** ${new Date(script.updated_at).toLocaleDateString()}\n` +
            `- **Last Updated:** ${new Date().toLocaleDateString()}\n` +
            `- **Suggestions:** ${suggestionStats.total}\n` +
            `- **Accepted Suggestions:** ${suggestionStats.accepted}\n\n` +
            `This script was created with the Rewrite application.`;

          await octokit.rest.repos.createOrUpdateFileContents({
            owner: script.github_owner,
            repo: script.github_repo,
            path: `${folderName}/README.md`,
            message: `Update README`,
            content: btoa(updatedReadme),
            sha: readmeFile.data.sha,
          });
          console.log(`Updated README.md`);
        } catch (error) {
          console.error("Error updating README:", error);
          // Continue even if README update fails
        }
      } catch (error) {
        console.error("Error updating content:", error);
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

  } catch (error) {
    console.error('Error in commit-script-changes:', error);
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
