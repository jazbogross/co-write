import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

serve(async (req: Request) => {
  try {
    // Only allow POST requests.
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    
    // Parse the JSON body to extract the installationId.
    const { installationId } = await req.json();
    if (!installationId) {
      return new Response(JSON.stringify({ active: false, error: "Missing installationId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Retrieve GitHub App credentials from environment variables.
    const appId = Deno.env.get("GITHUB_APP_ID");
    const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY");
    if (!appId || !privateKey) {
      return new Response(
        JSON.stringify({ active: false, error: "GitHub app credentials not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate a JWT for GitHub App authentication.
    const jwt = await create(
      { alg: "RS256", typ: "JWT" },
      {
        iat: getNumericDate(0),
        exp: getNumericDate(60 * 10), // JWT valid for 10 minutes
        iss: appId,
      },
      privateKey
    );

    // Query GitHub API to check if the installation exists/active.
    const response = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
      },
    });

    // If GitHub returns a successful response, the installation is valid.
    if (response.ok) {
      return new Response(JSON.stringify({ active: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // If not, return active: false (you may inspect response.status if needed).
      return new Response(JSON.stringify({ active: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Error verifying installation:", error);
    return new Response(JSON.stringify({ active: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
