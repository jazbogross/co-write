
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
    } = await req.json() as RequestBody;

    if (!scriptId || !githubAccessToken) {
      return new Response(
        JSON.stringify({ error: 'Script ID and GitHub access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get script data
    const { data: script, error: scriptError } = await supabaseClient
      .from('scripts')
      .select('id, title, github_repo, github_owner, admin_id, updated_at, folder_name')
      .eq('id', scriptId)
      .single() as { data: ScriptData | null, error: any };

    if (scriptError || !script) {
      console.error("Error fetching script:", scriptError);
      return new Response(
        JSON.stringify({ error: scriptError?.message || 'Script not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
    const octokit = new Octokit({
      auth: githubAccessToken
    });

    // Get or create folder name
    const folderName = scriptFolderName || script.folder_name || `${script.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().substring(7)}`;
    
    // If script doesn't have a folder_name yet, update it
    if (!script.folder_name) {
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
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/.gitkeep`,
              message: "Initialize script folder",
              content: "",
            });
            console.log(`Created folder ${folderName}`);
          } else {
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
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: script.github_owner,
              repo: script.github_repo,
              path: `${folderName}/versions/.gitkeep`,
              message: "Initialize versions folder",
              content: "",
            });
            console.log(`Created versions folder`);
          } else {
            throw error;
          }
        }

        // Create initial README.md
        if (readmeContent) {
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
          JSON.stringify({ error: `Error creating folder structure: ${error.message}` }),
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
