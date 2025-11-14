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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user has STAFF_MANAGER or ADMIN role
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || !['STAFF_MANAGER', 'ADMIN'].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const path = url.pathname

    // Route handlers
    if (path.includes('/alerts') && req.method === 'GET') {
      return await getAlerts(supabaseClient, url)
    } else if (path.includes('/alerts/') && path.includes('/ack') && req.method === 'PATCH') {
      return await acknowledgeAlert(supabaseClient, path)
    } else if (path.includes('/alerts/') && path.includes('/resolve') && req.method === 'PATCH') {
      return await resolveAlert(supabaseClient, path, req)
    } else if (path.includes('/metrics') && req.method === 'GET') {
      return await getMetrics(supabaseClient)
    } else if (path.includes('/trends') && req.method === 'GET') {
      return await getTrends(supabaseClient)
    } else if (path.includes('/settings') && req.method === 'GET') {
      return await getSettings(supabaseClient)
    } else if (path.includes('/settings') && req.method === 'PATCH') {
      if (userRole.role !== 'ADMIN') {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return await updateSettings(supabaseClient, req)
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in manager API:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function getAlerts(supabase: any, url: URL) {
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const severity = url.searchParams.get('severity')

  let query = supabase
    .from('alerts')
    .select('*, products(name, sku), tickets(ticket_number), repair_centers(name)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  if (severity) query = query.eq('severity', severity)

  const { data, error } = await query

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function acknowledgeAlert(supabase: any, path: string) {
  const alertId = path.split('/').filter(s => s.includes('-')).pop()

  const { error } = await supabase
    .from('alerts')
    .update({ status: 'ACKNOWLEDGED' })
    .eq('id', alertId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function resolveAlert(supabase: any, path: string, req: Request) {
  const alertId = path.split('/').filter(s => s.includes('-')).pop()
  const body = await req.json()

  const { error } = await supabase
    .from('alerts')
    .update({ 
      status: 'RESOLVED',
      resolution_note: body.resolutionNote || null
    })
    .eq('id', alertId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function getMetrics(supabase: any) {
  // Get ticket counts
  const { data: tickets } = await supabase
    .from('tickets')
    .select('status, repair_status, updated_at, created_at')

  const openTickets = tickets?.filter((t: any) => 
    !['RESOLVED', 'RETURN_COMPLETED', 'CANCELLED', 'REJECTED'].includes(t.status)
  ).length || 0

  const inRepair = tickets?.filter((t: any) => t.status === 'IN_REPAIR').length || 0

  // Calculate overdue repairs (> 10 days in repair)
  const tenDaysAgo = new Date()
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
  
  const overdueRepairs = tickets?.filter((t: any) => 
    t.status === 'IN_REPAIR' && new Date(t.updated_at) < tenDaysAgo
  ).length || 0

  // Get open alerts count
  const { count: alertsOpen } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OPEN')

  // Top faulty products (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: faultyTickets } = await supabase
    .from('tickets')
    .select('product_id, products(name, sku)')
    .eq('ticket_type', 'REPAIR')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const productCounts = faultyTickets?.reduce((acc: any, t: any) => {
    const id = t.product_id
    if (!acc[id]) {
      acc[id] = { productId: id, sku: t.products.sku, name: t.products.name, count: 0 }
    }
    acc[id].count++
    return acc
  }, {}) || {}

  const topFaultyProducts = Object.values(productCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  // Repair center performance
  const { data: centers } = await supabase
    .from('repair_centers')
    .select('id, name')

  const repairCenterPerformance = []

  for (const center of centers || []) {
    const { data: centerTickets } = await supabase
      .from('tickets')
      .select('status, created_at, updated_at')
      .eq('repair_center_id', center.id)

    const assigned = centerTickets?.length || 0
    const resolved = centerTickets?.filter((t: any) => 
      ['RESOLVED', 'RETURN_COMPLETED', 'REPLACEMENT_APPROVED'].includes(t.status)
    ).length || 0
    const resolvedRatio = assigned > 0 ? resolved / assigned : 0
    
    const overdue = centerTickets?.filter((t: any) => 
      t.status === 'IN_REPAIR' && new Date(t.updated_at) < tenDaysAgo
    ).length || 0

    const completedTickets = centerTickets?.filter((t: any) => 
      ['RESOLVED', 'RETURN_COMPLETED', 'REPLACEMENT_APPROVED'].includes(t.status) &&
      t.updated_at
    ) || []

    let avgRepairDays = 0
    if (completedTickets.length > 0) {
      const totalDays = completedTickets.reduce((sum: number, t: any) => {
        const days = Math.floor(
          (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
        )
        return sum + days
      }, 0)
      avgRepairDays = totalDays / completedTickets.length
    }

    repairCenterPerformance.push({
      centerId: center.id,
      name: center.name,
      assigned,
      resolvedRatio,
      overdue,
      avgRepairDays
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        kpis: {
          openTickets,
          inRepair,
          overdueRepairs,
          alertsOpen: alertsOpen || 0
        },
        topFaultyProducts,
        repairCenterPerformance
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function getTrends(supabase: any) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Daily ticket creation vs resolution
  const { data: tickets } = await supabase
    .from('tickets')
    .select('created_at, updated_at, status')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const dailyStats: any = {}
  
  tickets?.forEach((t: any) => {
    const date = new Date(t.created_at).toISOString().split('T')[0]
    if (!dailyStats[date]) {
      dailyStats[date] = { date, created: 0, resolved: 0 }
    }
    dailyStats[date].created++
    
    if (['RESOLVED', 'RETURN_COMPLETED'].includes(t.status)) {
      dailyStats[date].resolved++
    }
  })

  const dailyTrend = Object.values(dailyStats).sort((a: any, b: any) => 
    a.date.localeCompare(b.date)
  )

  return new Response(
    JSON.stringify({
      success: true,
      data: { dailyTrend }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function getSettings(supabase: any) {
  const { data, error } = await supabase
    .from('manager_settings')
    .select('*')
    .eq('key', 'manager.config')
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

async function updateSettings(supabase: any, req: Request) {
  const body = await req.json()

  const { error } = await supabase
    .from('manager_settings')
    .update({ value: body.value })
    .eq('key', 'manager.config')

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
