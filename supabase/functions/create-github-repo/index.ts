import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  scriptName: string;
  originalCreator: string;
  coAuthors: string[];
  isPrivate: boolean;
  installationId: string;
}

// Helper: Base64 URL encoding (for JWT parts)
function encodeBase64Url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: Standard base64 encoding (for file contents)
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Create a JWT manually using crypto.subtle, as in your working function
async function createJWT(appId: string, privateKeyPEM: string): Promise<string> {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const now = getNumericDate(0);
  const payload = JSON.stringify({
    iat: now,
    exp: now + 600, // 10 minutes expiration
    iss: appId,
  });

  const headerBase64 = encodeBase64Url(new TextEncoder().encode(header));
  const payloadBase64 = encodeBase64Url(new TextEncoder().encode(payload));
  const data = `${headerBase64}.${payloadBase64}`;

  // Remove PEM header/footer and newlines
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const keyContents = privateKeyPEM
    .replace(/\n/g, "")
    .replace(pemHeader, "")
    .replace(pemFooter, "");
  const binaryKey = Uint8Array.from(atob(keyContents), (c) =>
    c.charCodeAt(0)
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(data))
  );
  const signatureBase64 = encodeBase64Url(signature);
  return `${data}.${signatureBase64}`;
}

serve(async (req: Request) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }
    const body = await req.json() as RequestBody;
    console.log("Request Body:", body);
    const { scriptName, originalCreator, coAuthors, isPrivate, installationId } =
      body;
    if (!installationId) {
      throw new Error("Missing installationId");
    }

    // Retrieve GitHub App credentials
    const appId = Deno.env.get("GITHUB_APP_ID");
    let privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");
    if (!appId || !privateKey) {
      throw new Error("GitHub App credentials not set");
    }
    // Process private key: replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, "\n").trim();
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Invalid private key format. Must be PKCS#8.");
    }
    console.log("Using App ID:", appId);

    // Create JWT using our proven method
    console.log("Creating JWT...");
    const jwt = await createJWT(appId, privateKey);
    console.log("JWT created (first 50 chars):", jwt.substring(0, 50) + "...");

    // Use JWT to get installation details (to extract org login)
    const installationDetailsResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!installationDetailsResponse.ok) {
      const text = await installationDetailsResponse.text();
      throw new Error(
        `Failed to get installation details: ${installationDetailsResponse.status} ${text}`
      );
    }
    const installationDetails = await installationDetailsResponse.json();
    if (
      !installationDetails.account ||
      !installationDetails.account.login
    ) {
      throw new Error("Installation details missing account information");
    }
    const orgLogin = installationDetails.account.login;
    console.log("Installation organization login:", orgLogin);

    // Create installation access token
    console.log("Requesting installation access token...");
    const installationTokenResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!installationTokenResponse.ok) {
      const text = await installationTokenResponse.text();
      throw new Error(
        `Failed to get installation token: ${installationTokenResponse.status} ${text}`
      );
    }
    const installationTokenData = await installationTokenResponse.json();
    const installationToken = installationTokenData.token;
    console.log("Installation token obtained.");

    // Use Octokit with the installation token to create the repository.
    const { Octokit } = await import("https://esm.sh/@octokit/core");
    const octokit = new Octokit({ auth: installationToken });
    const repoName = `script-${scriptName}-${Date.now()}`;
    console.log("Creating repository:", repoName);
    const createRepoResponse = await octokit.request("POST /orgs/{org}/repos", {
      org: orgLogin,
      name: repoName,
      private: isPrivate,
      auto_init: true,
    });
    console.log("Repository created:", createRepoResponse.data.html_url);

    // Wait a short while for auto‑init to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Build initial README content
    const readmeContent = `# ${scriptName}\n\nCreated by: ${originalCreator}\n${
      coAuthors.length
        ? `\nContributors:\n${coAuthors.map((author) => `- ${author}`).join("\n")}`
        : ""
    }`;
    // Check if README exists (it should, because auto_init is true)
    let sha: string | undefined;
    try {
      const getReadmeResponse = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner: orgLogin, repo: repoName, path: "README.md" }
      );
      sha = getReadmeResponse.data.sha;
      console.log("Existing README found, SHA:", sha);
    } catch (error: any) {
      if (error.status === 404) {
        console.log("README not found; will create new one.");
      } else {
        throw error;
      }
    }
    const readmeParams: Record<string, unknown> = {
      owner: orgLogin,
      repo: repoName,
      path: "README.md",
      message: "Initial commit: Add README",
      content: encodeBase64(readmeContent),
      branch: "main",
    };
    if (sha) {
      readmeParams.sha = sha;
    }
    console.log("Creating/updating README...");
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", readmeParams);
    console.log("Repository setup complete.");

    return new Response(
      JSON.stringify({
        name: repoName,
        owner: orgLogin,
        html_url: createRepoResponse.data.html_url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
