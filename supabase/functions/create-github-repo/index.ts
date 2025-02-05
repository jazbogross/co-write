import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// These headers are used to allow CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Update the request interface to include our new fields.
interface RequestBody {
  scriptName: string;
  originalCreator: string;
  coAuthors: string[]; // e.g., list of usernames or emails
  isPrivate: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse the request body.
    const { scriptName, originalCreator, coAuthors, isPrivate } =
      (await req.json()) as RequestBody;

    // Validate required inputs.
    if (!scriptName) {
      throw new Error('Script name is required');
    }
    if (!originalCreator) {
      throw new Error('Original creator is required');
    }

    // Get GitHub token from the environment.
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // Define the repository name as required.
    const repoName = 'my-collaborative-scripts';
    console.log(`Creating GitHub repository: ${repoName}`);

    // Create the repository on GitHub.
    const repoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        name: repoName,
        private: isPrivate,
        auto_init: true, // Initialize with a README
      }),
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.error('GitHub API error:', errorText);
      throw new Error(`Failed to create repository: ${errorText}`);
    }

    const repo = await repoResponse.json();
    console.log('Repository created successfully:', repo.full_name);

    // Generate a folder name using the script name and a UUID.
    const folderUUID = crypto.randomUUID();
    const folderName = `${scriptName}_${folderUUID}`;

    // Prepare the initial JSON content for the script file.
    // Here we include a metadata section and an initial script object
    // with one empty line (line "1") with default formatting.
    const timestamp = new Date().toISOString();
    const initialScriptContent = {
      metadata: {
        scriptName: scriptName,
        originalCreator: originalCreator,
        coAuthors: coAuthors,
        dateCreated: timestamp,
        lastUpdated: timestamp,
      },
      script: {
        "1": {
          text: "",
          alignment: "left", // could be "left", "center", or "right"
          style: "regular",  // could be "regular", "italic", or "bold"
          createdAt: timestamp,
          editedAt: timestamp,
        },
      },
    };

    const fileContent = JSON.stringify(initialScriptContent, null, 2);

    // GitHub expects the file content to be base64 encoded.
    // (Deno’s btoa can be used for this, though for Unicode text you may need a more robust solution.)
    const encodedContent = btoa(fileContent);

    // Create the file (and its folder) in the repository using the GitHub Create-or-Update File API.
    // The path will be: <folderName>/script.json
    const filePath = `${folderName}/script.json`;
    const commitMessage = 'Initial commit: add script file';

    const createFileResponse = await fetch(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent,
          branch: repo.default_branch || 'main',
        }),
      },
    );

    if (!createFileResponse.ok) {
      const errorText = await createFileResponse.text();
      console.error('GitHub API error (create file):', errorText);
      throw new Error(`Failed to create script file: ${errorText}`);
    }

    const fileResult = await createFileResponse.json();
    console.log('Script file created successfully:', fileResult.content.path);

    return new Response(
      JSON.stringify({
        repository: {
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          htmlUrl: repo.html_url,
        },
        folderName: folderName,
        filePath: fileResult.content.path,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
