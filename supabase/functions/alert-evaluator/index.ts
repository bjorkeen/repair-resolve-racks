import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Config {
  windows: {
    faultRateDays: number
    duplicateSerialDays: number
    delayedRepairDays: number
    outOfWarrantyDays: number
    returnRateDays: number
  }
  thresholds: {
    faultyRequestsPerProduct: number
    repairCenterOverdueCount: number
    repairCenterResolvedRatioMin: number
    duplicateSerialCount: number
    outOfWarrantySpikeCount: number
    returnRatePercent: number
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Starting alert evaluation...')

    // Fetch configuration
    const { data: settingsData, error: settingsError } = await supabase
      .from('manager_settings')
      .select('value')
      .eq('key', 'manager.config')
      .single()

    if (settingsError) throw settingsError

    const config: Config = settingsData.value

    // Run all alert evaluations
    await evaluateHighFaultRatePerProduct(supabase, config)
    await evaluateDelayedRepairs(supabase, config)
    await evaluateHighReturnRate(supabase, config)
    await evaluateRepairCenterUnderperformance(supabase, config)
    await evaluateDuplicateSerialClaims(supabase, config)
    await evaluateOutOfWarrantySpike(supabase, config)

    console.log('Alert evaluation completed')

    return new Response(
      JSON.stringify({ success: true, message: 'Alert evaluation completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in alert evaluator:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function evaluateHighFaultRatePerProduct(supabase: any, config: Config) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.windows.faultRateDays)

  const { data: faultCounts, error } = await supabase
    .from('tickets')
    .select('product_id, products(name, sku)')
    .eq('ticket_type', 'REPAIR')
    .gte('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching fault counts:', error)
    return
  }

  // Group by product
  const productCounts = faultCounts.reduce((acc: any, ticket: any) => {
    const productId = ticket.product_id
    if (!acc[productId]) {
      acc[productId] = {
        count: 0,
        product: ticket.products
      }
    }
    acc[productId].count++
    return acc
  }, {})

  // Create alerts for products exceeding threshold
  for (const [productId, data] of Object.entries(productCounts)) {
    const { count, product } = data as any
    
    if (count >= config.thresholds.faultyRequestsPerProduct) {
      const severity = count >= config.thresholds.faultyRequestsPerProduct * 2 ? 'HIGH' : 'MEDIUM'
      
      // Check if alert already exists
      const { data: existing } = await supabase
        .from('alerts')
        .select('id, metric_value')
        .eq('type', 'HIGH_FAULT_RATE_PER_PRODUCT')
        .eq('product_id', productId)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (existing) {
        // Update if metric changed significantly
        if (Math.abs(existing.metric_value - count) > 2) {
          await supabase
            .from('alerts')
            .update({ 
              metric_value: count, 
              severity,
              description: `${count} faulty requests in last ${config.windows.faultRateDays} days`
            })
            .eq('id', existing.id)
        }
      } else {
        // Create new alert
        await supabase.from('alerts').insert({
          type: 'HIGH_FAULT_RATE_PER_PRODUCT',
          severity,
          title: `High Fault Rate: ${product.sku}`,
          description: `${count} faulty requests in last ${config.windows.faultRateDays} days`,
          product_id: productId,
          metric_value: count,
          threshold: config.thresholds.faultyRequestsPerProduct,
          status: 'OPEN'
        })
      }
    }
  }
}

async function evaluateDelayedRepairs(supabase: any, config: Config) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.windows.delayedRepairDays)

  const { data: delayedTickets, error } = await supabase
    .from('tickets')
    .select('id, ticket_number, updated_at, repair_centers(name)')
    .eq('status', 'IN_REPAIR')
    .lt('updated_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching delayed repairs:', error)
    return
  }

  for (const ticket of delayedTickets) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(ticket.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('type', 'DELAYED_REPAIRS')
      .eq('ticket_id', ticket.id)
      .eq('status', 'OPEN')
      .maybeSingle()

    if (!existing) {
      await supabase.from('alerts').insert({
        type: 'DELAYED_REPAIRS',
        severity: 'HIGH',
        title: `Delayed Repair: Ticket #${ticket.ticket_number}`,
        description: `In Repair for ${daysSinceUpdate} days (> ${config.windows.delayedRepairDays})`,
        ticket_id: ticket.id,
        metric_value: daysSinceUpdate,
        threshold: config.windows.delayedRepairDays,
        status: 'OPEN'
      })
    }
  }
}

async function evaluateHighReturnRate(supabase: any, config: Config) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.windows.returnRateDays)

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('product_id, ticket_type, products(name, sku)')
    .gte('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching tickets for return rate:', error)
    return
  }

  // Group by product
  const productStats = tickets.reduce((acc: any, ticket: any) => {
    const productId = ticket.product_id
    if (!acc[productId]) {
      acc[productId] = {
        total: 0,
        returns: 0,
        product: ticket.products
      }
    }
    acc[productId].total++
    if (ticket.ticket_type === 'RETURN') {
      acc[productId].returns++
    }
    return acc
  }, {})

  // Create alerts for high return rates
  for (const [productId, stats] of Object.entries(productStats)) {
    const { total, returns, product } = stats as any
    const returnRate = returns / total

    if (returnRate >= config.thresholds.returnRatePercent && total >= 10) {
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('type', 'HIGH_RETURN_RATE')
        .eq('product_id', productId)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (!existing) {
        await supabase.from('alerts').insert({
          type: 'HIGH_RETURN_RATE',
          severity: 'MEDIUM',
          title: `High Return Rate: ${product.sku}`,
          description: `${(returnRate * 100).toFixed(1)}% returns in last ${config.windows.returnRateDays} days`,
          product_id: productId,
          metric_value: returnRate,
          threshold: config.thresholds.returnRatePercent,
          status: 'OPEN'
        })
      }
    }
  }
}

async function evaluateRepairCenterUnderperformance(supabase: any, config: Config) {
  const { data: centers, error: centersError } = await supabase
    .from('repair_centers')
    .select('id, name')

  if (centersError) {
    console.error('Error fetching repair centers:', centersError)
    return
  }

  for (const center of centers) {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('status, updated_at')
      .eq('repair_center_id', center.id)

    if (error) continue

    const total = tickets.length
    if (total === 0) continue

    const resolved = tickets.filter((t: any) => 
      ['RESOLVED', 'RETURN_COMPLETED', 'REPLACEMENT_APPROVED'].includes(t.status)
    ).length

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.windows.delayedRepairDays)
    
    const overdue = tickets.filter((t: any) => 
      t.status === 'IN_REPAIR' && new Date(t.updated_at) < cutoffDate
    ).length

    const resolvedRatio = resolved / total

    if (
      overdue >= config.thresholds.repairCenterOverdueCount ||
      resolvedRatio < config.thresholds.repairCenterResolvedRatioMin
    ) {
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('type', 'REPAIR_CENTER_UNDERPERFORMANCE')
        .eq('repair_center_id', center.id)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (!existing) {
        await supabase.from('alerts').insert({
          type: 'REPAIR_CENTER_UNDERPERFORMANCE',
          severity: 'HIGH',
          title: `Underperforming Center: ${center.name}`,
          description: `Resolved ${(resolvedRatio * 100).toFixed(0)}%, overdue ${overdue}`,
          repair_center_id: center.id,
          metric_value: resolvedRatio,
          threshold: config.thresholds.repairCenterResolvedRatioMin,
          status: 'OPEN'
        })
      }
    }
  }
}

async function evaluateDuplicateSerialClaims(supabase: any, config: Config) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.windows.duplicateSerialDays)

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('serial_number, owner_id, customer_email')
    .gte('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching tickets for duplicate claims:', error)
    return
  }

  // Group by serial + owner
  const claimCounts = tickets.reduce((acc: any, ticket: any) => {
    const key = `${ticket.serial_number}-${ticket.owner_id}`
    if (!acc[key]) {
      acc[key] = {
        count: 0,
        serial: ticket.serial_number,
        email: ticket.customer_email
      }
    }
    acc[key].count++
    return acc
  }, {})

  // Create alerts for duplicates
  for (const [, data] of Object.entries(claimCounts)) {
    const { count, serial, email } = data as any

    if (count >= config.thresholds.duplicateSerialCount) {
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('type', 'DUPLICATE_SERIAL_CLAIMS')
        .ilike('description', `%${serial}%`)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (!existing) {
        await supabase.from('alerts').insert({
          type: 'DUPLICATE_SERIAL_CLAIMS',
          severity: 'MEDIUM',
          title: `Duplicate Serial Claims: ${serial}`,
          description: `Customer ${email} filed ${count} claims in ${config.windows.duplicateSerialDays} days`,
          metric_value: count,
          threshold: config.thresholds.duplicateSerialCount,
          status: 'OPEN'
        })
      }
    }
  }
}

async function evaluateOutOfWarrantySpike(supabase: any, config: Config) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.windows.outOfWarrantyDays)

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id')
    .eq('warranty_eligible', false)
    .gte('created_at', cutoffDate.toISOString())

  if (error) {
    console.error('Error fetching out-of-warranty tickets:', error)
    return
  }

  const count = tickets.length

  if (count >= config.thresholds.outOfWarrantySpikeCount) {
    const { data: existing } = await supabase
      .from('alerts')
      .select('id, metric_value')
      .eq('type', 'OUT_OF_WARRANTY_SPIKE')
      .eq('status', 'OPEN')
      .maybeSingle()

    if (existing) {
      if (Math.abs(existing.metric_value - count) > 3) {
        await supabase
          .from('alerts')
          .update({ 
            metric_value: count,
            description: `${count} out-of-warranty requests in last ${config.windows.outOfWarrantyDays} days`
          })
          .eq('id', existing.id)
      }
    } else {
      await supabase.from('alerts').insert({
        type: 'OUT_OF_WARRANTY_SPIKE',
        severity: 'LOW',
        title: 'Out-of-Warranty Spike',
        description: `${count} out-of-warranty requests in last ${config.windows.outOfWarrantyDays} days`,
        metric_value: count,
        threshold: config.thresholds.outOfWarrantySpikeCount,
        status: 'OPEN'
      })
    }
  }
}
