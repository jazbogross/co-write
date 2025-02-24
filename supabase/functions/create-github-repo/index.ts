import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAppAuth } from "https://esm.sh/@octokit/auth-app@4.0.13"
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
  installationId: string;
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

    const { scriptName, originalCreator, coAuthors, isPrivate, installationId } = body;

    if (!installationId) {
      throw new Error('❌ GitHub App installation ID is required');
    }

    console.log("🔑 Retrieving GitHub App credentials...");
    let privateKey: string | null = null;
    let appId: string | null = null;

    try {
      privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY") || null;
      appId = Deno.env.get("GITHUB_APP_ID") || null;
    } catch (error) {
      throw new Error("❌ Failed to retrieve environment variables: " + error.message);
    }

    console.log(`✅ GITHUB_APP_ID: ${appId}`);
    console.log(`✅ GITHUB_APP_PRIVATE_KEY Exists: ${!!privateKey}`);

    if (!appId || !privateKey) {
      throw new Error('❌ GitHub App credentials are not set in environment variables.');
    }

    // Debug: Log the raw private key **before processing**
    console.log(`🔍 Raw Private Key Length: ${privateKey.length}`);
    console.log("🔍 Raw Private Key (first 5 lines, as stored in Supabase):\n" + privateKey.split("\n").slice(0, 5).join("\n"));

    // Ensure privateKey is a string before applying `.replace()`
    privateKey = String(privateKey);

    // Fix newline and encoding issues
    privateKey = privateKey
      .replace(/\\n/g, '\n')  // Convert escaped newlines
      .replace(/\r\n/g, '\n') // Normalize Windows-style newlines
      .replace(/^"|"$/g, '')  // Remove surrounding double quotes
      .replace(/^'|'$/g, '')  // Remove surrounding single quotes
      .trim();

    // Debug: Log processed private key
    console.log(`✅ Processed Private Key Length: ${privateKey.length}`);
    console.log("✅ Processed Private Key (first 5 lines, after cleanup):\n" + privateKey.split("\n").slice(0, 5).join("\n"));

    // Ensure it's PKCS#8
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("❌ Invalid private key format. Ensure it's in PKCS#8 format.");
    }

    console.log("🔐 Initializing GitHub App authentication...");
    let auth;
    try {
      auth = createAppAuth({
        appId: appId,
        privateKey: String(privateKey), // Ensure it's explicitly a string
        installationId: installationId,
      });

      console.log("🔑 Requesting installation access token...");
      const installationAuthentication = await auth({ type: "installation" });

      console.log("✅ Installation Access Token received");

      const octokit = new Octokit({
        auth: installationAuthentication.token,
      });

      console.log(`🔎 Fetching GitHub App installation for ID: ${installationId}`);
      const { data: installation } = await octokit.rest.apps.getInstallation({
        installation_id: parseInt(installationId),
      });

      console.log("✅ GitHub App Installation Data:", installation);

      if (!installation) {
        throw new Error('❌ Could not find GitHub App installation');
      }

      // Create a unique repository name
      const repoName = `script-${scriptName}-${Date.now()}`
      console.log(`📂 Creating repository: ${repoName}`);

      // Create the repository
      const { data: repo } = await octokit.rest.repos.createInOrg({
        org: installation.account.login,
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

      console.log("📜 Preparing README content...");
      console.log(readmeContent);

      // Try updating README file if it exists, otherwise create a new one
      try {
        console.log("🔍 Checking if README.md already exists...");
        const { data: existingFile } = await octokit.rest.repos.getContent({
          owner: installation.account.login,
          repo: repoName,
          path: 'README.md',
        });

        console.log("✅ README.md found. Updating...");
        if ('sha' in existingFile) {
          await octokit.rest.repos.createOrUpdateFileContents({
            owner: installation.account.login,
            repo: repoName,
            path: 'README.md',
            message: 'Update README',
            content: btoa(readmeContent),
            sha: existingFile.sha,
            branch: 'main'
          });
          console.log("✅ README updated successfully");
        }
      } catch (error) {
        console.log("ℹ️ README.md not found. Creating new file...");
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: installation.account.login,
          repo: repoName,
          path: 'README.md',
          message: 'Initial commit: Add README',
          content: btoa(readmeContent),
          branch: 'main'
        });
        console.log("✅ README created successfully");
      }

      console.log('🎉 Repository setup complete:', {
        name: repoName,
        owner: installation.account.login,
        html_url: repo.html_url
      });

      return new Response(
        JSON.stringify({
          name: repoName,
          owner: installation.account.login,
          html_url: repo.html_url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );

    } catch (error) {
      console.error("❌ Error in GitHub App authentication:", error);
      throw new Error(`GitHub authentication failed: ${error.message}, App ID: ${appId}, Installation ID: ${installationId}`);
    }
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
