import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoAccount {
  email: string;
  password: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'REPAIR_CENTER' | 'STAFF_MANAGER';
  repairCenterId?: string;
}

const demoAccounts: DemoAccount[] = [
  {
    email: 'customer@demo.com',
    password: 'demo123',
    fullName: 'Demo Customer',
    role: 'CUSTOMER'
  },
  {
    email: 'staff@demo.com',
    password: 'demo123',
    fullName: 'Demo Staff Member',
    role: 'STAFF'
  },
  {
    email: 'admin@demo.com',
    password: 'demo123',
    fullName: 'Demo Administrator',
    role: 'ADMIN'
  },
  {
    email: 'manager@demo.com',
    password: 'demo123',
    fullName: 'Demo Staff Manager',
    role: 'STAFF_MANAGER'
  },
  {
    email: 'laptop@repair.demo',
    password: 'demo123',
    fullName: 'TechFix Laptop Center',
    role: 'REPAIR_CENTER',
    repairCenterId: '11111111-1111-1111-1111-111111111111'
  },
  {
    email: 'phone@repair.demo',
    password: 'demo123',
    fullName: 'PhoneCare Repair Hub',
    role: 'REPAIR_CENTER',
    repairCenterId: '22222222-2222-2222-2222-222222222222'
  },
  {
    email: 'appliance@repair.demo',
    password: 'demo123',
    fullName: 'Appliance Masters',
    role: 'REPAIR_CENTER',
    repairCenterId: '33333333-3333-3333-3333-333333333333'
  }
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results = [];

    for (const account of demoAccounts) {
      console.log(`Creating demo account: ${account.email}`);

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === account.email);

      if (userExists) {
        console.log(`User ${account.email} already exists, skipping`);
        results.push({ email: account.email, status: 'already_exists' });
        continue;
      }

      // Create user using admin API
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName
        }
      });

      if (userError) {
        console.error(`Error creating user ${account.email}:`, userError);
        results.push({ email: account.email, status: 'error', error: userError.message });
        continue;
      }

      console.log(`User created: ${account.email}, ID: ${userData.user.id}`);

      // The trigger will automatically create the profile and assign CUSTOMER role
      // Now we need to update the role if it's not CUSTOMER
      if (account.role !== 'CUSTOMER') {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: account.role })
          .eq('user_id', userData.user.id);

        if (roleError) {
          console.error(`Error updating role for ${account.email}:`, roleError);
          results.push({ 
            email: account.email, 
            status: 'created_but_role_error', 
            error: roleError.message 
          });
          continue;
        }

        console.log(`Role updated to ${account.role} for ${account.email}`);
      }

      // If it's a repair center, link user to the specific repair center
      if (account.role === 'REPAIR_CENTER' && account.repairCenterId) {
        const { error: repairCenterError } = await supabaseAdmin
          .from('repair_centers')
          .update({
            user_id: userData.user.id
          })
          .eq('id', account.repairCenterId);

        if (repairCenterError) {
          console.error(`Error linking repair center for ${account.email}:`, repairCenterError);
        } else {
          console.log(`Repair center linked for ${account.email}`);
        }
      }

      results.push({ 
        email: account.email, 
        status: 'success',
        role: account.role 
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Demo accounts seeding completed',
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in seed-demo-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
