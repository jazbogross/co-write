import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Octokit } from 'https://esm.sh/octokit@21.1.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  suggestionId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { suggestionId, status, rejectionReason } = await req.json() as RequestBody

    // Get suggestion details including script info
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from('script_suggestions')
      .select(`
        *,
        scripts:script_id (
          github_repo,
          github_owner
        )
      `)
      .eq('id', suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      console.error('Error fetching suggestion:', suggestionError)
      return new Response(
        JSON.stringify({ error: 'Suggestion not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: Deno.env.get('GITHUB_PAT')
    })

    if (status === 'approved') {
      try {
        // Create a merge
        await octokit.rest.repos.merge({
          owner: suggestion.scripts.github_owner,
          repo: suggestion.scripts.github_repo,
          base: 'main',
          head: suggestion.branch_name,
          commit_message: 'Merge approved suggestion'
        })

        // Delete the suggestion branch
        await octokit.rest.git.deleteRef({
          owner: suggestion.scripts.github_owner,
          repo: suggestion.scripts.github_repo,
          ref: `heads/${suggestion.branch_name}`
        })

        // Update script content in database
        await supabaseClient
          .from('scripts')
          .update({ content: suggestion.content })
          .eq('id', suggestion.script_id)

      } catch (error) {
        console.error('Error merging suggestion:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to merge suggestion' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (status === 'rejected' && suggestion.branch_name) {
      try {
        // Delete the suggestion branch for rejected suggestions
        await octokit.rest.git.deleteRef({
          owner: suggestion.scripts.github_owner,
          repo: suggestion.scripts.github_repo,
          ref: `heads/${suggestion.branch_name}`
        })
      } catch (error) {
        console.error('Error deleting rejected branch:', error)
        // Continue with rejection even if branch deletion fails
      }
    }

    // Update suggestion status in database
    const { error: updateError } = await supabaseClient
      .from('script_suggestions')
      .update({
        status,
        ...(rejectionReason && { rejection_reason: rejectionReason })
      })
      .eq('id', suggestionId)

    if (updateError) {
      console.error('Error updating suggestion status:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status,
        suggestionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handle-suggestion-status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
