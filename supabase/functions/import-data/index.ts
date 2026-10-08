// supabase/functions/import-data/index.ts
// AIU Ingestion Edge Function preserving typed columns, JSONB source-row, and relational validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { table, records } = body;

    if (!table || !records || !Array.isArray(records)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: 'table' and 'records' array required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate table name
    const validTables = [
      "user_details",
      "user_account_information",
      "user_address_details",
      "user_personal_details",
      "client_details",
    ];

    if (!validTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Unknown table: ${table}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Ensure data JSONB is populated for every row
    const processedRecords = records.map((r: any) => ({
      ...r,
      data: r.data || { ...r },
    }));

    const { data, error } = await supabaseClient.from(table).upsert(processedRecords);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        table,
        insertedCount: processedRecords.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Import execution error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
