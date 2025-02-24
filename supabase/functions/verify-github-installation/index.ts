import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom function to Base64 URL encode
function encodeBase64Url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Function to sign JWT manually using Deno's built-in crypto.subtle API
async function createJWT(appId: string, privateKeyPEM: string): Promise<string> {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const now = getNumericDate(0);
  const payload = JSON.stringify({
    iat: now,
    exp: now + 600,  // 10 minutes from `now`
    iss: appId,
  });

  const headerBase64 = encodeBase64Url(new TextEncoder().encode(header));
  const payloadBase64 = encodeBase64Url(new TextEncoder().encode(payload));
  const data = `${headerBase64}.${payloadBase64}`;

  // Convert PEM private key to CryptoKey
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  privateKeyPEM = privateKeyPEM.replace(/\n/g, "").replace(pemHeader, "").replace(pemFooter, "");

  const binaryKey = Uint8Array.from(atob(privateKeyPEM), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign JWT
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(data))
  );

  const signatureBase64 = encodeBase64Url(signature);
  return `${data}.${signatureBase64}`;
}

serve(async (req: Request) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      console.warn("Rejected non-POST request");
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders
      });
    }

    let body;
    try {
      body = await req.json();
      console.log("Request Body:", body);
    } catch (parseError) {
      console.error("Failed to parse JSON body:", parseError);
      return new Response(
        JSON.stringify({ active: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { installationId } = body;
    if (!installationId) {
      console.error("Missing installationId in request.");
      return new Response(
        JSON.stringify({ active: false, error: "Missing installationId" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get and verify GitHub App credentials
    const appId = Deno.env.get("GITHUB_APP_ID");
    let privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");

    console.log("Retrieved environment variables:");
    console.log("GITHUB_APP_ID:", appId || "NOT SET");
    console.log("GITHUB_APP_PRIVATE_KEY Exists:", !!privateKey);

    if (!appId || !privateKey) {
      console.error("GitHub app credentials not set");
      return new Response(
        JSON.stringify({ active: false, error: "GitHub app credentials not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up private key formatting
    privateKey = privateKey.replace(/\\n/g, '\n').trim();

    console.log("Processed Private Key (first 200 chars):", privateKey.substring(0, 200) + "...");

    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      console.error("Invalid private key format. Ensure it's PKCS#8 format.");
      return new Response(
        JSON.stringify({ active: false, error: "Invalid private key format. Must be PKCS#8" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Attempting to create JWT using crypto.subtle...");

    let jwt;
    try {
      jwt = await createJWT(appId, privateKey);
      console.log("JWT created successfully (First 50 chars):", jwt.substring(0, 50) + "...");
    } catch (jwtError) {
      console.error("JWT Creation Error:", jwtError);
      return new Response(
        JSON.stringify({ active: false, error: "Failed to generate JWT", details: jwtError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubResponse = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
    });

    console.log("GitHub API Response Status:", githubResponse.status);
    const responseText = await githubResponse.text();
    console.log("GitHub API Response:", responseText);

    return new Response(
      JSON.stringify({ active: githubResponse.ok }), 
      {
        status: githubResponse.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ active: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
