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

serve(async (req) => {
  console.log(`📌 Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");

    if (!appId || !privateKey) {
      throw new Error('❌ GitHub App credentials are not properly configured.');
    }

    console.log(`✅ GITHUB_APP_ID: ${appId}`);

    console.log("🔐 Initializing GitHub App authentication...");
    const auth = createAppAuth({
      appId: Number(appId),
      privateKey
    });

    console.log("🔑 Requesting installation access token...");
    const installationAuthentication = await auth({
      type: "installation",
      installationId: Number(installationId),
    });

    console.log("✅ Installation Access Token received");

    const octokit = new Octokit({ auth: installationAuthentication.token });

    console.log(`🔎 Fetching GitHub App installation details for ID: ${installationId}`);
    const { data: installation } = await octokit.request("GET /app/installations/{installation_id}", {
      installation_id: Number(installationId),
    });

    if (!installation || !installation.account || !installation.account.login) {
      throw new Error('❌ Could not find GitHub App installation account');
    }

    const orgLogin = installation.account.login;
    const repoName = `script-${scriptName}-${Date.now()}`;
    console.log(`📂 Creating repository: ${repoName}`);

    const { data: repo } = await octokit.request("POST /orgs/{org}/repos", {
      org: orgLogin,
      name: repoName,
      private: isPrivate,
      auto_init: true,
    });

    console.log(`✅ Repository created successfully: ${repo.html_url}`);

    // Create initial README content
    const readmeContent = `# ${scriptName}\n\nCreated by: ${originalCreator}\n${
      coAuthors.length ? `\nContributors:\n${coAuthors.map(author => `- ${author}`).join('\n')}` : ''
    }`;

    console.log("📝 Creating initial README...");
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: orgLogin,
      repo: repoName,
      path: "README.md",
      message: "Initial commit: Add README",
      content: Buffer.from(readmeContent).toString("base64"),
      branch: "main"
    });

    console.log('🎉 Repository setup complete');

    return new Response(
      JSON.stringify({
        name: repoName,
        owner: orgLogin,
        html_url: repo.html_url
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
