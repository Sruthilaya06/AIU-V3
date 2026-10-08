// server.ts
// AIU V3 Server Entry Point: Express with Vite middlewares & isolated V3 API endpoints
// Adheres strictly to AI Studio full-stack framework guidelines

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import { planNaturalLanguageQuery } from './src/server/v3/nlQueryPlanner';
import { executeV3QueryPlan } from './src/server/v3/queryEngine';
import { getV3TableStats } from './src/server/v3/v3_db';
import { validateV3QueryPlan } from './src/server/v3/queryValidator';
import { V3QueryPlan } from './src/server/v3/queryPlanTypes';
import { buildDeterministicV3Plan } from './src/server/v3/deterministicLookupPlanner';

// Load dev secrets if present
if (fs.existsSync('/app/.dev.env.json')) {
  try {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
    Object.assign(process.env, devEnv);
  } catch {
    // Ignore
  }
}
dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // Isolated V3 API Endpoints
  // ==========================================

  // Health / Stats
  app.get('/api/v3/stats', async (_req, res) => {
    try {
      const stats = await getV3TableStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Master V3 NL Query Pipeline
  app.post('/api/v3/query', async (req, res) => {
    const startTime = performance.now();
    try {
      const {
        requirement,
        searchMode,
        identifierType,
        singleIdentifier,
        bulkIdentifiers,
        selectedFields,
      } = req.body;

      const hasNLRequirement = Boolean(requirement && typeof requirement === 'string' && requirement.trim());

      let plan: V3QueryPlan;

      const computedMetricAliases = new Set([
        'trade_count',
        'total_trade_value',
        'avg_trade_value',
        'max_trade_value',
        'min_trade_value',
        'latest_trade_date',
      ]);

      // Helper to clean identifiers without type coercion or stripping text
      const cleanId = (raw: string, type?: string): string => {
        const trimmed = String(raw).trim();
        if (type === 'phone') {
          return trimmed.replace(/[\s-]/g, '');
        }
        if (type === 'form_number') {
          return trimmed;
        }
        return trimmed.toUpperCase();
      };

      const validFields = Array.isArray(selectedFields) && selectedFields.length > 0
        ? selectedFields
        : ['client_code'];

      // 1. THREE COMPLETELY INDEPENDENT SEARCH MODES:
      // Mode A / B / C: SINGLE SEARCH (with identifier)
      if (searchMode === 'single' && singleIdentifier && String(singleIdentifier).trim()) {
        const targetClient = cleanId(singleIdentifier, identifierType);

        // MODE A — Pure deterministic lookup (NL field is empty)
        if (!hasNLRequirement) {
          plan = buildDeterministicV3Plan({
            searchMode: 'single',
            identifierType,
            singleIdentifier: targetClient,
            selectedFields: validFields,
          });
        } else {
          // MODE B & C — Client Code + Natural Language instruction
          // Check for Client Code Conflict (Section 5)
          const nlClientCodes = requirement.match(/\bCL\d{5}\b/gi)?.map((c) => c.toUpperCase()) || [];
          const conflicting = nlClientCodes.find((c) => c !== targetClient.toUpperCase());
          if (conflicting) {
            return res.status(400).json({
              success: false,
              error: `Client Code conflict: the Single Search identifier is ${targetClient} but the query mentions ${conflicting}. Please use the same client code.`,
            });
          }

          // Parse NL requirement to determine requested operation/metric
          const plannerResult = await planNaturalLanguageQuery(requirement);
          if (!plannerResult.success && plannerResult.isUnsafe) {
            return res.status(400).json({
              success: false,
              isUnsafe: true,
              error: plannerResult.error,
            });
          }
          if (plannerResult.clarificationNeeded) {
            return res.json({
              success: false,
              clarificationNeeded: true,
              clarificationPrompt: plannerResult.clarificationPrompt,
            });
          }
          if (!plannerResult.success || !plannerResult.plan) {
            return res.status(400).json({
              success: false,
              error: plannerResult.error || 'Failed to formulate a valid query plan.',
            });
          }

          plan = { ...plannerResult.plan };

          // Authoritatively inject singleIdentifier as mandatory filter
          const idCol = identifierType === 'form_number'
            ? 'form_number'
            : identifierType === 'phone'
            ? 'user_mobile_number'
            : identifierType === 'pan'
            ? 'client_pan_number'
            : 'client_code';

          plan.filters = (plan.filters || []).filter((f) => f.field !== idCol && f.field !== 'client_code');
          plan.filters.push({ field: idCol, operator: '=', value: targetClient });

          if (plan.aggregations && plan.aggregations.length > 0) {
            plan.groupBy = ['client_code'];
            plan.selectedFields = ['client_code'];
            plan.limit = undefined;
          } else {
            // MODE C: User selected specific output fields
            if (Array.isArray(selectedFields) && selectedFields.length > 0) {
              const physicalSelected = selectedFields.filter((f) => !computedMetricAliases.has(f));
              if (physicalSelected.length > 0) {
                plan.selectedFields = physicalSelected;
              }
            }
          }
        }
      }
      // Mode B: BULK SEARCH
      else if (searchMode === 'bulk') {
        if (!Array.isArray(bulkIdentifiers) || bulkIdentifiers.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Bulk Search requires uploaded identifiers.',
          });
        }

        const validBulk = bulkIdentifiers.map((id: string) => cleanId(String(id), identifierType));

        if (!hasNLRequirement) {
          plan = buildDeterministicV3Plan({
            searchMode: 'bulk',
            identifierType,
            bulkIdentifiers: validBulk,
            selectedFields: validFields,
          });
        } else {
          const plannerResult = await planNaturalLanguageQuery(requirement);
          if (!plannerResult.success && plannerResult.isUnsafe) {
            return res.status(400).json({
              success: false,
              isUnsafe: true,
              error: plannerResult.error,
            });
          }
          if (plannerResult.clarificationNeeded) {
            return res.json({
              success: false,
              clarificationNeeded: true,
              clarificationPrompt: plannerResult.clarificationPrompt,
            });
          }
          if (!plannerResult.success || !plannerResult.plan) {
            return res.status(400).json({
              success: false,
              error: plannerResult.error || 'Failed to formulate a valid query plan.',
            });
          }

          plan = { ...plannerResult.plan };

          const idCol = identifierType === 'form_number'
            ? 'form_number'
            : identifierType === 'phone'
            ? 'user_mobile_number'
            : identifierType === 'pan'
            ? 'client_pan_number'
            : 'client_code';

          plan.filters = (plan.filters || []).filter((f) => f.field !== idCol && f.field !== 'client_code');
          plan.filters.push({ field: idCol, operator: 'IN', value: validBulk });

          if (plan.aggregations && plan.aggregations.length > 0) {
            plan.groupBy = ['client_code'];
            plan.selectedFields = ['client_code'];
            plan.limit = undefined;
          } else {
            // Bulk raw records
            const hasExplicitLimitInText = /\b(?:top|last|latest|limit|first)\s+\d+\b/i.test(requirement);
            if (!hasExplicitLimitInText) {
              plan.limit = undefined;
            } else if (/\b(?:for\s+(?:each|every|all)\s+client)\b/i.test(requirement)) {
              const perClientLimit = parseInt(requirement.match(/\b(?:top|last|latest|limit|first)\s+(\d+)\b/i)?.[1] || '5', 10);
              plan.limit = validBulk.length * perClientLimit;
            }
          }
        }
      }
      // Mode C: NATURAL LANGUAGE SEARCH
      else {
        if (!hasNLRequirement) {
          if (searchMode === 'single') {
            return res.status(400).json({
              success: false,
              requiresIdentifier: true,
              error: 'Single Search requires a valid identifier (e.g. Client Code CL00101).',
            });
          }
          return res.status(400).json({
            success: false,
            error: 'Please enter a natural-language retrieval requirement.',
          });
        }

        // Natural Language Planning with Identifier Context
        const promptToPlan =
          singleIdentifier && !requirement.includes(singleIdentifier)
            ? `${requirement} for ${singleIdentifier}`
            : requirement;

        const plannerResult = await planNaturalLanguageQuery(promptToPlan);

        // Handle unsafe requests
        if (!plannerResult.success && plannerResult.isUnsafe) {
          return res.status(400).json({
            success: false,
            isUnsafe: true,
            error: plannerResult.error,
          });
        }

        // Handle ambiguity / clarifications
        if (plannerResult.clarificationNeeded) {
          return res.json({
            success: false,
            clarificationNeeded: true,
            clarificationPrompt: plannerResult.clarificationPrompt,
          });
        }

        if (!plannerResult.success || !plannerResult.plan) {
          return res.status(400).json({
            success: false,
            error: plannerResult.error || 'Failed to formulate a valid query plan.',
          });
        }

        plan = { ...plannerResult.plan };

        // Check if client identifier is required for client-specific requirement
        const hasClientFilterInPlan = plan.filters?.some((f) => f.field === 'client_code');
        const mentionsSpecificClient =
          /(?:for\s+(?:this|the|given)\s+client|(?:this|the|given)\s+client|for\s+client\b)/i.test(requirement) ||
          (/^(?:show\s+)?(?:the\s+)?(?:last|latest)\s+\d+\s+trades\.?$/i.test(requirement.trim()) && !/every|all|each/i.test(requirement));

        const hasBulkIdentifiers = Array.isArray(bulkIdentifiers) && bulkIdentifiers.length > 0;

        if (
          !singleIdentifier &&
          !hasBulkIdentifiers &&
          !hasClientFilterInPlan &&
          mentionsSpecificClient
        ) {
          return res.status(400).json({
            success: false,
            requiresIdentifier: true,
            error: 'This query is client-specific. Please enter a Client Code (e.g. CL00101) to view records for a specific client.',
          });
        }

        if (singleIdentifier) {
          const idCol = identifierType === 'form_number'
            ? 'form_number'
            : identifierType === 'phone'
            ? 'user_mobile_number'
            : identifierType === 'pan'
            ? 'client_pan_number'
            : 'client_code';

          plan.filters = (plan.filters || []).filter((f) => f.field !== idCol && f.field !== 'client_code');
          plan.filters.push({ field: idCol, operator: '=', value: cleanId(singleIdentifier, identifierType) });
        }
      }

      // 3. User Override on Selected Fields
      if (Array.isArray(selectedFields) && selectedFields.length > 0) {
        if (!plan.aggregations || plan.aggregations.length === 0) {
          // For raw/row-level queries, strip out computed aggregate aliases that do not exist as physical columns
          const physicalSelected = selectedFields.filter((f) => !computedMetricAliases.has(f));
          if (physicalSelected.length > 0) {
            plan.selectedFields = physicalSelected;
          }
        }
      }

      // 4. Validate Modified Plan
      const val = validateV3QueryPlan(plan);
      if (!val.valid) {
        return res.status(400).json({
          success: false,
          error: `Query Validation Error: ${val.error}`,
        });
      }

      // 5. Execute Plan via V3 Query Engine
      const executionResult = await executeV3QueryPlan(plan);

      // 6. Build Rich Human-Readable Query Interpretation
      const tableFriendlyNames: Record<string, string> = {
        v3_trade_details_equity: 'Trade Details',
        v3_order_details_equity: 'Order Details',
        v3_client_details: 'Client Details',
        v3_user_details: 'User Details',
        v3_user_account_information: 'User Account Information',
        v3_user_address_details: 'User Address Details',
        v3_user_personal_details: 'User Personal Details',
      };

      const metricFriendlyNames = plan.aggregations && plan.aggregations.length > 0
        ? plan.aggregations.map((a) => {
            if (a.alias === 'trade_count' || (a.function === 'COUNT' && a.field === 'trade_reference')) return 'Trade Count';
            if (a.alias === 'total_trade_value' || (a.function === 'SUM' && a.field === 'trade_value')) return 'Total Trade Value';
            if (a.alias === 'avg_trade_value' || (a.function === 'AVG' && a.field === 'trade_value')) return 'Average Trade Value';
            if (a.alias === 'max_trade_value' || (a.function === 'MAX' && a.field === 'trade_value')) return 'Highest Trade Value';
            if (a.alias === 'min_trade_value' || (a.function === 'MIN' && a.field === 'trade_value')) return 'Lowest Trade Value';
            return `${a.function}(${a.field})`;
          }).join(', ')
        : 'Raw Record Retrieval';

      const groupByFriendly = plan.groupBy && plan.groupBy.length > 0
        ? plan.groupBy.map((g) => g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')
        : 'None (Ungrouped)';

      let clientFilterFriendly = 'None (Population-level)';
      const clientFilter = plan.filters?.find((f) => f.field === 'client_code');
      if (clientFilter) {
        if (Array.isArray(clientFilter.value)) {
          clientFilterFriendly = `${clientFilter.value.length} uploaded clients`;
        } else {
          clientFilterFriendly = `Client ${clientFilter.value}`;
        }
      } else if (searchMode === 'bulk' && Array.isArray(bulkIdentifiers) && bulkIdentifiers.length > 0) {
        clientFilterFriendly = `${bulkIdentifiers.length} uploaded clients`;
      } else if (searchMode === 'single' && singleIdentifier) {
        clientFilterFriendly = `Client ${singleIdentifier}`;
      }

      const periodFriendly = plan.dateFilters && plan.dateFilters.length > 0
        ? plan.dateFilters.map((d) => {
            if (d.startDate === '2026-07-01' && d.endDate === '2026-07-31') return 'July 2026 (2026-07-01 to 2026-07-31)';
            if (d.startDate === '2026-05-01' && d.endDate === '2026-06-30') return 'May–June 2026 (2026-05-01 to 2026-06-30)';
            if (d.startDate === '2026-05-01' && d.endDate === '2026-05-31') return 'May 2026 (2026-05-01 to 2026-05-31)';
            if (d.startDate === '2026-06-01' && d.endDate === '2026-06-30') return 'June 2026 (2026-06-01 to 2026-06-30)';
            return d.exactDate || `${d.startDate || 'start'} to ${d.endDate || 'end'}`;
          }).join(', ')
        : 'All Available Dates';

      const rankingFriendly = plan.orderBy && plan.orderBy.length > 0
        ? plan.orderBy.map((o) => `${o.field.replace(/_/g, ' ')} ${o.direction}`).join(', ')
        : 'Default Ordering';

      const interpretation: Record<string, any> = {
        primaryTable: tableFriendlyNames[plan.table] || plan.table,
        groupBy: groupByFriendly,
        metric: metricFriendlyNames,
        metrics: metricFriendlyNames,
        clientFilter: clientFilterFriendly,
        period: periodFriendly,
        filters: plan.filters?.map((f) => `${f.field} ${f.operator} ${Array.isArray(f.value) ? `[${f.value.length} items]` : f.value}`) || [],
        ranking: rankingFriendly,
        limit: plan.limit ? String(plan.limit) : 'No Limit',
        rawPlan: plan,
      };

      const totalTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

      res.json({
        ...executionResult,
        queryMetadata: {
          ...executionResult.queryMetadata,
          totalPipelineTimeMs: totalTimeMs,
          interpretation,
          plan,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Server Processing Error: ${err.message || 'Internal failure'}`,
      });
    }
  });

  // Direct Plan Execution (useful for custom queries or exact plan reruns)
  app.post('/api/v3/execute-plan', async (req, res) => {
    try {
      const plan = req.body as V3QueryPlan;
      const result = await executeV3QueryPlan(plan);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AIU Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
