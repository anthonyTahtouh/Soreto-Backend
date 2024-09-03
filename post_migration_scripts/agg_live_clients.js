
exports.seed = function(knex) {
  return knex.raw(`

  DROP VIEW IF EXISTS reverb.agg_live_clients_js;

  CREATE OR REPLACE VIEW reverb.agg_live_clients_js
  AS
    SELECT c.NAME,
           y.client      AS "clientId",
           y.created_at  AS "placementCreatedAt",
           y.email       AS "placementEmail",
           y.firstname   AS "placementFirstName",
           y.referrer    AS "placementReferrer",
           z.created_at  AS "pixelCreatedAt",
           z.email       AS "pixelEmail",
           z.referrer    AS "pixelReferrer",
           z.order_id    AS "pixelOrderId",
           z.order_total AS "pixelOrderTotal",
           z.line_items  AS "pixelLineItems"
    FROM   reverb.client c
           JOIN (SELECT DISTINCT ON (client) client,
                                             created_at,
                                             email,
                                             firstname,
                                             referrer
                 FROM   (SELECT meta ->> 'clientId'  client,
                                created_at,
                                meta ->> 'email'     email,
                                meta ->> 'firstName' firstname,
                                meta ->> 'referer'   referrer
                         FROM   reverb.log_track_trigger
                         WHERE  created_at BETWEEN NOW() - INTERVAL '24 HOURS' AND NOW()
                         AND meta ->> 'method' = '/placement/:clientId/:placementType'
                                AND meta ->> 'testMode' = 'false') x
                 ORDER  BY client,
                           created_at DESC) y
             ON c._id = y.client
           JOIN (SELECT DISTINCT ON (client) client,
                                             created_at,
                                             email,
                                             referrer,
                                             order_id,
                                             order_total,
                                             line_items
                 FROM   (SELECT meta -> 'info' ->> 'clientId'   client,
                                created_at,
                                meta -> 'info' ->> 'buyerEmail' email,
                                meta -> 'info' ->> 'orderId'    order_id,
                                meta -> 'info' ->> 'orderTotal' order_total,
                                meta -> 'info' ->> 'lineItems'  line_items,
                                meta ->> 'referer'              referrer
                         FROM   reverb.log_track_trigger
                         WHERE  created_at BETWEEN NOW() - INTERVAL '24 HOURS' AND NOW()
                         AND  meta ->> 'method' = '/tracking/reverbpixel.png'
                                AND meta ->> 'testMode' = 'false') x
                 ORDER  BY client,
                           created_at DESC) z
             ON y.client = z.client
  `);
};
