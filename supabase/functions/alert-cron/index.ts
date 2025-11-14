import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Running hourly alert evaluation cron job...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Call the alert evaluator function
    const { data, error } = await supabase.functions.invoke('alert-evaluator')

    if (error) {
      console.error('Error calling alert evaluator:', error)
      throw error
    }

    console.log('Alert evaluation completed:', data)

    return new Response(
      JSON.stringify({ success: true, message: 'Cron job completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in alert cron:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
