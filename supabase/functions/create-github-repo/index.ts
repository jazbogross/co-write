import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAppAuth } from "https://esm.sh/@octokit/auth-app";
import { Octokit } from "https://esm.sh/@octokit/core";

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

/**
 * Converts a PEM-encoded PKCS#8 private key to a properly formatted string.
 */
function processPrivateKey(pem: string): string {
  console.log("🔍 Processing Private Key...");

  const cleanedKey = pem
    .replace(/\\n/g, '\n')  // Convert escaped newlines
    .replace(/\r\n/g, '\n') // Normalize Windows-style newlines
    .replace(/^"|"$/g, '')  // Remove surrounding double quotes
    .replace(/^'|'$/g, '')  // Remove surrounding single quotes
    .trim();

  console.log("✅ Processed Private Key (First 50 chars):", cleanedKey.substring(0, 50) + "...");
  
  if (!cleanedKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("❌ Invalid private key format. Ensure it's PKCS#8 format.");
  }

  return cleanedKey;
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
    const appId = Deno.env.get("GITHUB_APP_ID");
    let privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");

    if (!appId || !privateKey) {
      throw new Error('❌ GitHub App credentials are not properly configured.');
    }

    console.log(`✅ GITHUB_APP_ID: ${appId}`);
    console.log(`✅ Private key exists: ${!!privateKey}`);

    // Ensure private key is correctly formatted for @octokit/auth-app
    privateKey = processPrivateKey(privateKey);

    try {
      console.log("🔐 Initializing GitHub App authentication...");
      const auth = createAppAuth({
        appId: Number(appId),
        privateKey,
        installationId: Number(installationId),
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

      console.log("📝 Creating initial README...");
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: installation.account.login,
        repo: repoName,
        path: 'README.md',
        message: 'Initial commit: Add README',
        content: btoa(readmeContent),
        branch: 'main'
      });

      console.log('🎉 Repository setup complete');

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
      throw new Error(`GitHub authentication failed: ${error.message}`);
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
