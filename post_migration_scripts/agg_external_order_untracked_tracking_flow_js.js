
exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_external_order_untracked_tracking_flow_js;
    CREATE OR REPLACE VIEW reverb.agg_external_order_untracked_tracking_flow_js AS
    SELECT 
      eou._id,
      "eou"."holder_id" as "affiliate",
      "eou"."fallback_type" as "fallbackType",
      "eou"."unresolved",
      "eou"."meta" as "orderMeta",
      coalesce("eou"."meta" -> 'transactionDate', 
        "eou"."meta" -> 'date', 
        "eou"."meta" -> 'timeOfEvent', 
        "eou"."meta" -> 'transdate', 
        "eou"."meta" -> 'transactionDate', 
        "eou"."meta" -> 'eventDate') as "dateOrder",
      coalesce("eou"."meta" ->> 'client_order_id', "eou"."meta" ->> 'orderId', "eou"."meta" ->> 'order_id', "eou"."meta" ->> 'orderRef', "eou"."meta" ->> 'Oid', "eou"."meta" ->> 'clientOrderId') as "clientOrderId",
      coalesce("eou"."meta" -> 'saleAmount.amount', 
        "eou"."meta" -> 'saleAmountPubCurrency', 
        "eou"."meta" -> 'SaleValue', 
        "eou"."meta" -> 'meta.Amount', 
        "eou"."meta" -> 'sale_amount', 
        "eou"."meta" -> 'sales', 
        "eou"."meta" -> 'orderValue', 
        "eou"."meta" -> 'saleValue', 
        "eou"."meta" -> 'saleValue', 
        "eou"."meta" -> 'transamount', 
        "eou"."meta" -> 'meta.IntendedAmount') as "value",
      "cli"."name" as "clientName"
    FROM 
      reverb."external_order_untracked" as "eou"
      left join reverb."client" as "cli"
      on "cli"."_id" = "eou"."client_id" 
  `);
};
