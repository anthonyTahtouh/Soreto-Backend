export function up(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_orders_js AS
    SELECT 
      o._id,
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      o.client_order_id as "clientOrderId",
      o.status,
      o.total,
      o.client_id as "clientId",
      o.sharer_id as "sharerId",
      o.buyer_id as "buyerId",
      o.line_items as "lineItems",
      o.sub_total as "subtotal",
      o.currency,
      o.commission,
      o.meta,
      c.name as "clientName"
    FROM 
      reverb.order o
      JOIN reverb.client c ON o.client_id = c._id
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.agg_orders_js;
    `;
  return knex.schema.raw(query);
}
