import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders
      });
    }
    
    // Parse the JSON body to extract the installationId
    const { installationId } = await req.json();
    if (!installationId) {
      console.error("Missing installationId in request.");
      return new Response(
        JSON.stringify({ active: false, error: "Missing installationId" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Retrieve GitHub App credentials from environment variables
    const appId = Deno.env.get("GITHUB_APP_ID");
    let privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");

    // Debugging logs
    console.log("App ID:", appId);
    console.log("Private Key Exists:", !!privateKey);

    if (!appId || !privateKey) {
      console.error("GitHub app credentials not set.");
      return new Response(
        JSON.stringify({ active: false, error: "GitHub app credentials not set" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Restore newlines in private key (fix for environment variable formatting issues)
    privateKey = privateKey.replace(/\\n/g, "\n");

    // Generate a JWT for GitHub App authentication
    let jwt;
    try {
      jwt = await create(
        { alg: "RS256", typ: "JWT" },
        {
          iat: getNumericDate(0),
          exp: getNumericDate(60 * 10), // JWT valid for 10 minutes
          iss: appId,
        },
        privateKey
      );
      console.log("Generated JWT:", jwt.substring(0, 50) + "..."); // Print first 50 characters for debugging
    } catch (jwtError) {
      console.error("JWT Creation Error:", jwtError);
      return new Response(
        JSON.stringify({ active: false, error: "Failed to generate JWT" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Query GitHub API to check if the installation exists/active
    console.log(`Checking installation with ID: ${installationId}`);

    const response = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
      },
    });

    console.log('GitHub API Response:', response.status);

    // If GitHub returns a successful response, the installation is valid
    if (response.ok) {
      return new Response(
        JSON.stringify({ active: true }), 
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      // If not, return active: false
      console.error("GitHub installation verification failed:", await response.text());
      return new Response(
        JSON.stringify({ active: false, error: "Invalid installation ID or authentication failed" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error: any) {
    console.error("Error verifying installation:", error);
    return new Response(
      JSON.stringify({ active: false, error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
