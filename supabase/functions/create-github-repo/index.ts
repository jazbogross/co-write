import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers to allow cross-origin requests.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define the shape of the expected request payload.
interface RequestBody {
  scriptName: string;
  originalCreator: string;
  coAuthors: string[];
  isPrivate: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse and log the incoming request body.
    const body = await req.json();
    console.log("Received body:", body);
    const { scriptName, originalCreator, coAuthors, isPrivate } = body as RequestBody;

    // Validate required inputs.
    if (!scriptName) {
      throw new Error('Script name is required');
    }
    if (!originalCreator) {
      throw new Error('Original creator is required');
    }

    // Retrieve the GitHub token from environment variables.
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // First, get the authenticated user's info.
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!userResponse.ok) {
      throw new Error('Failed to retrieve user information');
    }
    const user = await userResponse.json();
    const owner = user.login;

    // Define the fixed repository name.
    const repoName = 'my-collaborative-scripts';
    let repo;

    // Check if the repository already exists by fetching it.
    const getRepoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (getRepoResponse.ok) {
      repo = await getRepoResponse.json();
      console.log(`Repository ${repoName} already exists.`);
    } else if (getRepoResponse.status === 404) {
      // If the repository doesn't exist, create it.
      const createRepoResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          auto_init: true, // Initialize with a README
        }),
      });
      if (!createRepoResponse.ok) {
        const errorText = await createRepoResponse.text();
        throw new Error(`Failed to create repository: ${errorText}`);
      }
      repo = await createRepoResponse.json();
      console.log('Repository created successfully:', repo.full_name);
    } else {
      // If there's another error when checking the repository, throw an error.
      const errorText = await getRepoResponse.text();
      throw new Error(`Failed to get repository info: ${errorText}`);
    }

    // Create a unique folder name using the script name and a UUID.
    const folderUUID = crypto.randomUUID();
    const folderName = `${scriptName}_${folderUUID}`;

    // Prepare the initial JSON content for the script file.
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
          alignment: "left", // options: "left", "center", "right"
          style: "regular",  // options: "regular", "italic", "bold"
          createdAt: timestamp,
          editedAt: timestamp,
        },
      },
    };

    // Stringify and encode the JSON file content.
    const fileContent = JSON.stringify(initialScriptContent, null, 2);
    const encodedContent = btoa(fileContent);

    // Use the script name for the JSON file name.
    const jsonFileName = `${scriptName}.json`;
    const filePath = `${folderName}/${jsonFileName}`;
    const commitMessage = `Initial commit: add ${scriptName} script file`;

    // Create the file in the repository using GitHub's Create-or-Update File API.
    const createFileResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo.name}/contents/${filePath}`,
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
