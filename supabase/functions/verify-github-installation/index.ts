
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
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

    console.log("App ID:", appId);
    console.log("Private key exists:", !!privateKey);

    if (!appId || !privateKey) {
      console.error("GitHub app credentials not set");
      return new Response(
        JSON.stringify({ active: false, error: "GitHub app credentials not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up the private key
    privateKey = privateKey
      .replace(/\\n/g, '\n')
      .replace(/^"|"$/g, '')
      .replace(/^'|'$/g, '');

    if (!privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      console.error("Invalid private key format");
      return new Response(
        JSON.stringify({ active: false, error: "Invalid private key format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Attempting to create JWT...");
    
    try {
      const jwt = await create(
        { alg: "RS256", typ: "JWT" },
        {
          iat: getNumericDate(0),
          exp: getNumericDate(600), // 10 minutes
          iss: appId,
        },
        privateKey
      );

      console.log("JWT created successfully");

      const githubResponse = await fetch(`https://api.github.com/app/installations/${installationId}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
      });

      console.log('GitHub API Response Status:', githubResponse.status);
      const responseText = await githubResponse.text();
      console.log('GitHub API Response:', responseText);

      return new Response(
        JSON.stringify({ active: githubResponse.ok }), 
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (jwtError) {
      console.error("JWT Creation Error:", jwtError);
      console.error("JWT Creation Error Stack:", jwtError.stack);
      return new Response(
        JSON.stringify({ 
          active: false, 
          error: "Failed to generate JWT",
          details: jwtError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ active: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
