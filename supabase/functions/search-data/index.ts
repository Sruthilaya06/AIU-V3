// supabase/functions/search-data/index.ts
// AIU Relational Retrieval Edge Function with Multi-Match Support & Output Field Minimization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  searchMode?: "single" | "bulk";
  searchType: "mobile" | "client_code" | "form_number";
  searchValue?: string;
  values?: string[];
  selectedFields?: string[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: SearchRequest = await req.json();
    const { searchMode = "single", searchType, searchValue, values = [], selectedFields = [] } = body;

    const targets: string[] =
      searchMode === "bulk"
        ? Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)))
        : [String(searchValue || "").trim()].filter(Boolean);

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({
          error: "At least one search identifier is required",
          status: "ERROR",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Step 1: Collect seed keys using Grouped Mappings
    const targetToFormNumbers = new Map<string, Set<number>>();
    const targetToClientCodes = new Map<string, Set<string>>();
    const allFormNumbers = new Set<number>();
    const allClientCodes = new Set<string>();

    targets.forEach((t) => {
      targetToFormNumbers.set(t, new Set());
      targetToClientCodes.set(t, new Set());
    });

    if (searchType === "mobile") {
      const { data: addresses } = await supabaseClient
        .from("user_address_details")
        .select("form_number, user_mobile_number")
        .in("user_mobile_number", targets);

      (addresses || []).forEach((a: any) => {
        const mob = String(a.user_mobile_number).trim();
        const fNum = Number(a.form_number);
        if (targetToFormNumbers.has(mob)) {
          targetToFormNumbers.get(mob)!.add(fNum);
        }
        allFormNumbers.add(fNum);
      });
    } else if (searchType === "client_code") {
      targets.forEach((c) => {
        const cUp = c.toUpperCase();
        targetToClientCodes.get(c)!.add(cUp);
        allClientCodes.add(cUp);
      });
    } else if (searchType === "form_number") {
      targets.forEach((f) => {
        const num = Number(f);
        if (!isNaN(num)) {
          targetToFormNumbers.get(f)!.add(num);
          allFormNumbers.add(num);
        }
      });
    }

    // Step 2: Traverse Relationships to discover ALL related forms & client codes
    if (allFormNumbers.size > 0) {
      const { data: accounts } = await supabaseClient
        .from("user_account_information")
        .select("form_number, client_code")
        .in("form_number", Array.from(allFormNumbers));

      (accounts || []).forEach((acc: any) => {
        const fNum = Number(acc.form_number);
        const cCode = String(acc.client_code).toUpperCase();
        allClientCodes.add(cCode);

        // Associate back to targets
        targets.forEach((t) => {
          if (targetToFormNumbers.get(t)?.has(fNum)) {
            targetToClientCodes.get(t)?.add(cCode);
          }
        });
      });
    }

    if (allClientCodes.size > 0) {
      const { data: accounts } = await supabaseClient
        .from("user_account_information")
        .select("form_number, client_code")
        .in("client_code", Array.from(allClientCodes));

      (accounts || []).forEach((acc: any) => {
        const fNum = Number(acc.form_number);
        const cCode = String(acc.client_code).toUpperCase();
        allFormNumbers.add(fNum);

        // Associate back to targets
        targets.forEach((t) => {
          if (targetToClientCodes.get(t)?.has(cCode)) {
            targetToFormNumbers.get(t)?.add(fNum);
          }
        });
      });
    }

    // Step 3: Fetch related entities across 5 tables
    const cCodesArr = Array.from(allClientCodes);
    const fNumsArr = Array.from(allFormNumbers);

    const [uDetails, uAccounts, uAddresses, uPersonal, cDetails] = await Promise.all([
      cCodesArr.length > 0
        ? supabaseClient.from("user_details").select("*").in("client_code", cCodesArr).then((r) => r.data || [])
        : Promise.resolve([]),
      fNumsArr.length > 0
        ? supabaseClient.from("user_account_information").select("*").in("form_number", fNumsArr).then((r) => r.data || [])
        : Promise.resolve([]),
      fNumsArr.length > 0
        ? supabaseClient.from("user_address_details").select("*").in("form_number", fNumsArr).then((r) => r.data || [])
        : Promise.resolve([]),
      fNumsArr.length > 0
        ? supabaseClient.from("user_personal_details").select("*").in("form_number", fNumsArr).then((r) => r.data || [])
        : Promise.resolve([]),
      fNumsArr.length > 0 || cCodesArr.length > 0
        ? supabaseClient.from("client_details").select("*").in("form_number", fNumsArr).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    // Grouping maps (handling multiple items per key)
    const uDetailsByCode = new Map(uDetails.map((u: any) => [String(u.client_code).toUpperCase(), u]));
    const uAccountsByForm = new Map(uAccounts.map((a: any) => [Number(a.form_number), a]));
    const uAddressesByForm = new Map(uAddresses.map((a: any) => [Number(a.form_number), a]));
    const uPersonalByForm = new Map(uPersonal.map((p: any) => [Number(p.form_number), p]));
    const cDetailsByForm = new Map(cDetails.map((c: any) => [Number(c.form_number), c]));

    // Step 4: Construct unified result array for every target (preserving multiple matches)
    const results = targets.map((target) => {
      const linkedForms = Array.from(targetToFormNumbers.get(target) || []);
      const linkedCodes = Array.from(targetToClientCodes.get(target) || []);

      const matchingRecords: any[] = [];

      if (linkedForms.length > 0) {
        linkedForms.forEach((fNum) => {
          const acc = uAccountsByForm.get(fNum);
          const cCode = acc?.client_code ? String(acc.client_code).toUpperCase() : (linkedCodes[0] || null);
          const ud = cCode ? uDetailsByCode.get(cCode) : null;
          const uadd = uAddressesByForm.get(fNum);
          const up = uPersonalByForm.get(fNum);
          const cd = cDetailsByForm.get(fNum);

          const merged: Record<string, any> = {
            ...(ud || {}),
            ...(acc || {}),
            ...(uadd || {}),
            ...(up || {}),
            ...(cd || {}),
          };

          // Filter only requested columns if specified (Priority 3)
          if (selectedFields.length > 0) {
            const filtered: Record<string, any> = {};
            selectedFields.forEach((col) => {
              filtered[col] = merged[col] ?? null;
            });
            matchingRecords.push(filtered);
          } else {
            matchingRecords.push(merged);
          }
        });
      } else if (linkedCodes.length > 0) {
        linkedCodes.forEach((cCode) => {
          const ud = uDetailsByCode.get(cCode);
          if (ud) {
            if (selectedFields.length > 0) {
              const filtered: Record<string, any> = {};
              selectedFields.forEach((col) => {
                filtered[col] = ud[col] ?? null;
              });
              matchingRecords.push(filtered);
            } else {
              matchingRecords.push(ud);
            }
          }
        });
      }

      if (matchingRecords.length === 0) {
        return {
          identifier: target,
          status: "NO MATCH",
          matchCount: 0,
          records: [],
          values: {},
        };
      }

      return {
        identifier: target,
        status: "MATCHED",
        matchCount: matchingRecords.length,
        records: matchingRecords,
        values: matchingRecords[0] || {},
      };
    });

    return new Response(
      JSON.stringify({
        searchMode,
        searchType,
        totalRequested: targets.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Edge function retrieval failure" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
