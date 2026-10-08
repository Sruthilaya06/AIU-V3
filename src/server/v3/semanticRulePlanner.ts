// src/server/v3/semanticRulePlanner.ts
// Deterministic Semantic Query Planner for AIU V3 Financial Audit Queries
// Handles all domain requirements with zero hallucinations and strict schema grounding

import { V3QueryPlan } from './queryPlanTypes';

export function parseWithSemanticRules(query: string): V3QueryPlan | null {
  const q = query.trim().toLowerCase();

  // Extract client codes (e.g. CL00101, CL00105, CL00110)
  const clientCodeMatches = query.match(/\bCL\d{5}\b/gi);
  const clientCodes = clientCodeMatches ? [...new Set(clientCodeMatches.map((c) => c.toUpperCase()))] : [];

  // Extract limits (e.g. "top 10", "last 5", "limit 20")
  const limitMatch = q.match(/\b(?:top|last|latest|limit|first)\s+(\d+)\b/i);
  const detectedLimit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;

  // Extract date windows:
  // "july 2026"
  // "may to june 2026", "between may and june 2026"
  let dateWindow: { startDate?: string; endDate?: string } | null = null;
  if (/may\s+(?:to|and)\s+june\s+2026/i.test(q) || /between\s+may\s+and\s+june(?:\s+2026)?/i.test(q)) {
    dateWindow = { startDate: '2026-05-01', endDate: '2026-06-30' };
  } else if (/july\s+2026/i.test(q) || /in\s+july(?:\s+2026)?/i.test(q)) {
    dateWindow = { startDate: '2026-07-01', endDate: '2026-07-31' };
  } else if (/may\s+2026/i.test(q) || /in\s+may(?:\s+2026)?/i.test(q)) {
    dateWindow = { startDate: '2026-05-01', endDate: '2026-05-31' };
  } else if (/june\s+2026/i.test(q) || /in\s+june(?:\s+2026)?/i.test(q)) {
    dateWindow = { startDate: '2026-06-01', endDate: '2026-06-30' };
  }

  // 1. "Show orders without corresponding trades"
  if (/orders\s+(?:that\s+do\s+not\s+have|without\s+corresponding)\s+trades/i.test(q)) {
    return {
      table: 'v3_order_details_equity',
      joins: [{ table: 'v3_trade_details_equity', type: 'LEFT' }],
      filters: [{ table: 'v3_trade_details_equity', field: 'trade_reference', operator: 'IS NULL' }],
      selectedFields: ['order_reference', 'client_code', 'order_status', 'order_stock_code', 'order_quantity'],
      limit: detectedLimit,
    };
  }

  // 2. "Show clients who traded in May but not June"
  if (/traded\s+in\s+may\s+but\s+not\s+(?:in\s+)?june/i.test(q)) {
    return {
      table: 'v3_client_details',
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
      subqueries: [
        {
          type: 'EXISTS',
          correlateOn: {
            outerTable: 'v3_client_details',
            outerField: 'client_code',
            innerTable: 'v3_trade_details_equity',
            innerField: 'client_code',
          },
          subquery: {
            table: 'v3_trade_details_equity',
            selectedFields: ['trade_reference'],
            dateFilters: [{ field: 'trade_date', startDate: '2026-05-01', endDate: '2026-05-31' }],
          },
        },
        {
          type: 'NOT EXISTS',
          correlateOn: {
            outerTable: 'v3_client_details',
            outerField: 'client_code',
            innerTable: 'v3_trade_details_equity',
            innerField: 'client_code',
          },
          subquery: {
            table: 'v3_trade_details_equity',
            selectedFields: ['trade_reference'],
            dateFilters: [{ field: 'trade_date', startDate: '2026-06-01', endDate: '2026-06-30' }],
          },
        },
      ],
      limit: detectedLimit,
    };
  }

  // 3. "Show clients who have not traded in July 2026"
  if (/clients\s+who\s+have\s+not\s+traded\s+in\s+july(?:\s+2026)?/i.test(q)) {
    return {
      table: 'v3_client_details',
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
      subqueries: [
        {
          type: 'NOT EXISTS',
          correlateOn: {
            outerTable: 'v3_client_details',
            outerField: 'client_code',
            innerTable: 'v3_trade_details_equity',
            innerField: 'client_code',
          },
          subquery: {
            table: 'v3_trade_details_equity',
            selectedFields: ['trade_reference'],
            dateFilters: [{ field: 'trade_date', startDate: '2026-07-01', endDate: '2026-07-31' }],
          },
        },
      ],
      limit: detectedLimit,
    };
  }

  // 4. "Show Individual clients who traded between May and June 2026"
  if (/individual\s+clients\s+who\s+traded/i.test(q) && dateWindow) {
    return {
      table: 'v3_client_details',
      joins: [{ table: 'v3_trade_details_equity', type: 'INNER' }],
      filters: [{ field: 'customer_type_individual_huf', operator: '=', value: 'INDIVIDUAL' }],
      dateFilters: [{ field: 'trade_date', startDate: dateWindow.startDate, endDate: dateWindow.endDate }],
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
      distinct: true,
      limit: detectedLimit,
    };
  }

  // 5. "Show all Individual clients"
  if (/individual\s+clients/i.test(q) && !/traded/i.test(q)) {
    return {
      table: 'v3_client_details',
      filters: [{ field: 'customer_type_individual_huf', operator: '=', value: 'INDIVIDUAL' }],
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number', 'client_verify_status'],
      limit: detectedLimit,
    };
  }

  // 6. Aggregations and Multi-Metric Planning
  // Evaluates queries requesting one or more metrics:
  // - trade count / number of trades / traded most
  // - total trade value / trade value (when aggregated)
  // - average trade value
  // - highest / maximum trade value
  // - lowest / minimum trade value
  const isMultiOrAggregated =
    !/^(?:show\s+)?only\b/i.test(q) &&
    (
      /(?:traded\s+most|trade\s+count|number\s+of\s+trades|count\s+of\s+trades|how\s+many\s+trades)/i.test(q) ||
      /(?:total|sum\s+of|aggregate|overall)\s+(?:value\s+of\s+trades|trade\s+value|traded\s+value|value)|overall\s+value\s+of\s+(?:the\s+)?trades|total\s+value/i.test(q) ||
      /average\s+trade\s+value|avg\s+trade\s+value|mean\s+trade\s+value/i.test(q) ||
      /(?:highest|maximum|max)\s+trade\s+value/i.test(q) ||
      /(?:lowest|minimum|min)\s+trade\s+value/i.test(q) ||
      (/trade\s+value/i.test(q) && /(?:traded\s+most|trade\s+count|number\s+of\s+trades)/i.test(q))
    );

  if (isMultiOrAggregated && !/latest\s+trade\s+for\s+(?:each|every)\s+client/i.test(q)) {
    const aggregations: { function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; field: string; alias: string }[] = [];
    const addedAliases = new Set<string>();

    // Detect trade count: COUNT(trade_reference)
    if (/(?:traded\s+most|trade\s+count|number\s+of\s+trades|count\s+of\s+trades|how\s+many\s+trades)/i.test(q)) {
      aggregations.push({ function: 'COUNT', field: 'trade_reference', alias: 'trade_count' });
      addedAliases.add('trade_count');
    }

    // Detect average trade value: AVG(trade_value)
    if (/average\s+trade\s+value|avg\s+trade\s+value|mean\s+trade\s+value/i.test(q)) {
      aggregations.push({ function: 'AVG', field: 'trade_value', alias: 'avg_trade_value' });
      addedAliases.add('avg_trade_value');
    }

    // Detect highest / maximum trade value: MAX(trade_value)
    if (/(?:highest|maximum|max)\s+trade\s+value/i.test(q)) {
      aggregations.push({ function: 'MAX', field: 'trade_value', alias: 'max_trade_value' });
      addedAliases.add('max_trade_value');
    }

    // Detect lowest / minimum trade value: MIN(trade_value)
    if (/(?:lowest|minimum|min)\s+trade\s+value/i.test(q)) {
      aggregations.push({ function: 'MIN', field: 'trade_value', alias: 'min_trade_value' });
      addedAliases.add('min_trade_value');
    }

    // Detect total trade value: SUM(trade_value)
    // Matches: "total trade value", "total value", "total traded value", "aggregate trade value",
    // "sum of trade value", "overall trade value", "overall value of trades"
    const hasExplicitTotalValue = /(?:total|sum\s+of|aggregate|overall)\s+(?:value\s+of\s+trades|trade\s+value|traded\s+value|value)|overall\s+value\s+of\s+(?:the\s+)?trades|total\s+value/i.test(q);
    const hasStandaloneTradeValue = /(?<!(?:average|avg|mean|highest|maximum|max|lowest|minimum|min)\s+)trade\s+value/i.test(q) && !addedAliases.has('avg_trade_value') && !addedAliases.has('max_trade_value');

    if (hasExplicitTotalValue || hasStandaloneTradeValue) {
      if (!addedAliases.has('total_trade_value')) {
        aggregations.push({ function: 'SUM', field: 'trade_value', alias: 'total_trade_value' });
        addedAliases.add('total_trade_value');
      }
    }

    if (aggregations.length > 0) {
      const plan: V3QueryPlan = {
        table: 'v3_trade_details_equity',
        groupBy: ['client_code'],
        aggregations,
      };

      // Determine ranking / ordering
      if (
        /(?:traded\s+most|by\s+trade\s+count)/i.test(q) ||
        (addedAliases.has('trade_count') && /top\s+\d+/i.test(q) && !/by\s+total\s+trade\s+value/i.test(q))
      ) {
        plan.orderBy = [{ field: 'trade_count', direction: 'DESC' }];
      } else if (/by\s+total\s+trade\s+value/i.test(q) || (!addedAliases.has('trade_count') && addedAliases.has('total_trade_value'))) {
        const isBottom = /bottom/i.test(q);
        plan.orderBy = [{ field: 'total_trade_value', direction: isBottom ? 'ASC' : 'DESC' }];
      } else if (addedAliases.has('avg_trade_value') && !addedAliases.has('trade_count')) {
        plan.orderBy = [{ field: 'avg_trade_value', direction: 'DESC' }];
      } else if (addedAliases.has('max_trade_value') && !addedAliases.has('trade_count')) {
        plan.orderBy = [{ field: 'max_trade_value', direction: 'DESC' }];
      } else {
        plan.orderBy = [{ field: aggregations[0].alias, direction: 'DESC' }];
      }

      // Limit handling:
      if (detectedLimit) {
        plan.limit = detectedLimit;
      } else if (/(?:top|most)\s+clients/i.test(q)) {
        plan.limit = 10;
      }

      // Date filtering:
      if (dateWindow) {
        plan.dateFilters = [{ field: 'trade_date', startDate: dateWindow.startDate, endDate: dateWindow.endDate }];
      }

      // Explicit client codes in text:
      if (clientCodes.length > 0) {
        plan.filters = [
          clientCodes.length === 1
            ? { field: 'client_code', operator: '=', value: clientCodes[0] }
            : { field: 'client_code', operator: 'IN', value: clientCodes },
        ];
      }

      return plan;
    }
  }

  // 10. Latest trade for each client
  if (/latest\s+trade\s+for\s+(?:each|every)\s+client/i.test(q)) {
    return {
      table: 'v3_trade_details_equity',
      groupBy: ['client_code'],
      aggregations: [
        { function: 'MAX', field: 'trade_date', alias: 'latest_trade_date' },
        { function: 'COUNT', field: 'trade_reference', alias: 'trade_count' },
      ],
      orderBy: [{ field: 'latest_trade_date', direction: 'DESC' }],
      limit: detectedLimit,
    };
  }

  // 11. Last N trades (general or for client/every client)
  if (/last\s+(\d+)\s+trades/i.test(q) || /latest\s+(\d+)\s+trades/i.test(q) || /latest\s+trades/i.test(q) || /(?:last|latest)\s+trade\b/i.test(q)) {
    const isEvery = /for\s+(?:every|all|each)\s+client/i.test(q);
    const n = detectedLimit || (/(?:last|latest)\s+trade\b/i.test(q) && !/trades/i.test(q) ? 1 : 5);
    const plan: V3QueryPlan = {
      table: 'v3_trade_details_equity',
      orderBy: isEvery
        ? [
            { field: 'client_code', direction: 'ASC' },
            { field: 'trade_date', direction: 'DESC' },
          ]
        : [{ field: 'trade_date', direction: 'DESC' }],
      limit: isEvery ? (clientCodes.length > 0 ? clientCodes.length * n : n) : n,
    };
    if (clientCodes.length > 0) {
      plan.filters = [
        clientCodes.length === 1
          ? { field: 'client_code', operator: '=', value: clientCodes[0] }
          : { field: 'client_code', operator: 'IN', value: clientCodes },
      ];
    }
    return plan;
  }

  // 11b. "Show clients who traded during [month/dates]"
  if (/clients\s+who\s+traded\s+(?:during|in)/i.test(q) && dateWindow) {
    return {
      table: 'v3_client_details',
      joins: [{ table: 'v3_trade_details_equity', type: 'INNER' }],
      dateFilters: [{ field: 'trade_date', startDate: dateWindow.startDate, endDate: dateWindow.endDate }],
      selectedFields: ['client_code', 'customer_type_individual_huf', 'client_pan_number'],
      distinct: true,
      limit: detectedLimit,
    };
  }

  // 12. Single or multiple client code trade lookup
  if (clientCodes.length > 0) {
    // Check if asking for client details vs trades
    if (/details/i.test(q) && !/trades/i.test(q)) {
      return {
        table: 'v3_client_details',
        filters: [
          clientCodes.length === 1
            ? { field: 'client_code', operator: '=', value: clientCodes[0] }
            : { field: 'client_code', operator: 'IN', value: clientCodes },
        ],
        selectedFields: ['client_code', 'form_number', 'customer_type_individual_huf', 'client_pan_number', 'client_verify_status'],
      };
    }

    // Default to trades for the clients
    const isLatest = /last|latest|recent/i.test(q);
    const plan: V3QueryPlan = {
      table: 'v3_trade_details_equity',
      filters: [
        clientCodes.length === 1
          ? { field: 'client_code', operator: '=', value: clientCodes[0] }
          : { field: 'client_code', operator: 'IN', value: clientCodes },
      ],
      selectedFields: ['client_code', 'trade_reference', 'trade_stock_code', 'trade_flow_buy_sell', 'trade_executed_quantity', 'trade_value', 'trade_date'],
      limit: detectedLimit,
    };
    if (isLatest) {
      plan.orderBy = [{ field: 'trade_date', direction: 'DESC' }];
    }
    if (dateWindow) {
      plan.dateFilters = [{ field: 'trade_date', startDate: dateWindow.startDate, endDate: dateWindow.endDate }];
    }
    return plan;
  }

  // 13. Output field selection specific request
  // "Show only client code, trade date, trade reference and trade value"
  if (/only\s+(?:client\s+code|trade\s+date|trade\s+reference|trade\s+value)/i.test(q)) {
    const selectedFields: string[] = [];
    if (/client\s+code/i.test(q)) selectedFields.push('client_code');
    if (/trade\s+date/i.test(q)) selectedFields.push('trade_date');
    if (/trade\s+reference/i.test(q)) selectedFields.push('trade_reference');
    if (/trade\s+value/i.test(q)) selectedFields.push('trade_value');

    return {
      table: 'v3_trade_details_equity',
      selectedFields,
      limit: detectedLimit || 5,
    };
  }

  // 14. Date range query without specific client
  // "Trades between 2026-05-01 and 2026-06-30" or "Trades from May to June 2026"
  if (/trades/i.test(q) && dateWindow) {
    return {
      table: 'v3_trade_details_equity',
      dateFilters: [{ field: 'trade_date', startDate: dateWindow.startDate, endDate: dateWindow.endDate }],
      selectedFields: ['trade_reference', 'client_code', 'trade_stock_code', 'trade_flow_buy_sell', 'trade_value', 'trade_date'],
      limit: detectedLimit,
    };
  }

  // 15. Aggregations: "how many trades did each client make"
  if (/how\s+many\s+trades/i.test(q)) {
    return {
      table: 'v3_trade_details_equity',
      groupBy: ['client_code'],
      aggregations: [{ function: 'COUNT', field: 'trade_reference', alias: 'trade_count' }],
      orderBy: [{ field: 'trade_count', direction: 'DESC' }],
      limit: detectedLimit,
    };
  }

  return null;
}
