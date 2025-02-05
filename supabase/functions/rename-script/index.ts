import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  scriptId: string;
  newTitle: string;
  oldTitle: string;
}

export default serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { scriptId, newTitle, oldTitle } = await req.json() as RequestBody;
    console.log("Renaming script:", { scriptId, newTitle, oldTitle });

    // Get the GitHub token
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // Get script details from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Fetch script details
    const scriptResponse = await fetch(`${supabaseUrl}/rest/v1/scripts?id=eq.${scriptId}&select=github_repo,github_owner`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!scriptResponse.ok) {
      throw new Error('Failed to fetch script details');
    }

    const scripts = await scriptResponse.json();
    if (!scripts.length) {
      throw new Error('Script not found');
    }

    const { github_repo, github_owner } = scripts[0];
    if (!github_repo || !github_owner) {
      throw new Error('GitHub repository details not found');
    }

    // Generate the old and new folder names (using the same UUID pattern)
    const oldFolderName = `${oldTitle}_`;
    const newFolderName = `${newTitle}_`;

    // First, get the repository contents to find the folder
    const contentsResponse = await fetch(`https://api.github.com/repos/${github_owner}/${github_repo}/contents`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!contentsResponse.ok) {
      throw new Error('Failed to fetch repository contents');
    }

    const contents = await contentsResponse.json();
    const oldFolder = contents.find((item: any) => item.name.startsWith(oldFolderName));
    
    if (!oldFolder) {
      throw new Error('Original script folder not found');
    }

    // Get the UUID part from the old folder name
    const uuid = oldFolder.name.split('_')[1];
    const exactNewFolderName = `${newTitle}_${uuid}`;

    // Get the contents of the old folder
    const folderContentsResponse = await fetch(`https://api.github.com/repos/${github_owner}/${github_repo}/contents/${oldFolder.name}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!folderContentsResponse.ok) {
      throw new Error('Failed to fetch folder contents');
    }

    const folderContents = await folderContentsResponse.json();
    const scriptFile = folderContents.find((file: any) => file.name.endsWith('.json'));
    
    if (!scriptFile) {
      throw new Error('Script file not found in folder');
    }

    // Get the current file content
    const fileResponse = await fetch(scriptFile.url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file content');
    }

    const fileData = await fileResponse.json();
    const content = JSON.parse(atob(fileData.content));

    // Update the script name in the content
    content.metadata.scriptName = newTitle;

    // Create new file with updated name
    const newFileName = `${newTitle}.json`;
    const encodedContent = btoa(JSON.stringify(content, null, 2));

    // Create the new file in the new location
    const createResponse = await fetch(
      `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${exactNewFolderName}/${newFileName}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: `Rename script from ${oldTitle} to ${newTitle}`,
          content: encodedContent,
        }),
      }
    );

    if (!createResponse.ok) {
      throw new Error('Failed to create new file');
    }

    // Delete the old file
    const deleteResponse = await fetch(
      `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${oldFolder.name}/${scriptFile.name}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: `Delete old script file ${oldTitle}`,
          sha: scriptFile.sha,
        }),
      }
    );

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete old file');
    }

    // Delete the old folder if it's empty
    const deleteOldFolderResponse = await fetch(
      `https://api.github.com/repos/${github_owner}/${github_repo}/contents/${oldFolder.name}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: `Delete old script folder ${oldTitle}`,
          sha: oldFolder.sha,
        }),
      }
    );

    if (!deleteOldFolderResponse.ok) {
      throw new Error('Failed to delete old folder');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        newFolder: exactNewFolderName,
        newFile: newFileName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
