
exports.seed = function(knex) {
  return knex.raw(`
    CREATE OR REPLACE VIEW reverb.agg_orders_js AS
    SELECT o._id,
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      o.client_order_id AS "clientOrderId",
      o.status,
      o.total,
      o.client_id AS "clientId",
      o.sharer_id AS "sharerId",
      o.buyer_id AS "buyerId",
      o.line_items AS "lineItems",
      o.sub_total AS subtotal,
      o.currency,
      o.commission,
      o.meta,
      c.name AS "clientName",
      o.buyer_email AS "buyerEmail",
      o.test_mode AS "testMode"
      FROM reverb."order" o
        JOIN reverb.client c ON o.client_id = c._id;
  `);
};