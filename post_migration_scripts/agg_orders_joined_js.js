
exports.seed = function(knex) {
  return knex.raw(`

  CREATE OR REPLACE VIEW reverb.agg_orders_joined_js AS
  
  WITH soreto_orders AS (

    SELECT
      o._id
      , o.created_at AS "createdAt"
      , o.updated_at AS "updatedAt"
      , o.client_order_id AS "clientOrderId"
      , o.status
      , o.total
      , o.client_id AS "clientId"
      , o.sharer_id AS "sharerId"
      , o.buyer_id AS "buyerId"
      , o.currency
      , o.commission
      , o.buyer_email AS "buyerEmail"
      , o.test_mode AS "testMode"
      , 'soreto-order'::text AS "type"
  
    FROM
      reverb."order" o
    WHERE
      client_id NOT IN (select client_id from reverb.assoc_affiliate_merchant_client)
      OR
      client_id IN (
        
        select  
          client_id
        from
        (
          
          select
            client_id,
            now() >= max(assocI.connected_at) and now() <= max(case when assocI.disconnected_at is null then '3000-01-01'::date else assocI.disconnected_at end) as "connected"
          from
            reverb.assoc_affiliate_merchant_client assocI
          group by
            client_id
                    
        ) a1
        WHERE 
        a1.connected = false
      )
  ),
    
  external_orders AS (
      
    SELECT
        eo._id
        , eo.transacted_at AS "createdAt"
        , eo.updated_at AS "updatedAt"
        , eo.client_order_id AS "clientOrderId"
        , eo.status
        , eo.total
        , eo.client_id AS "clientId"
        , su.user_id AS "sharerId"
        , o.buyer_id AS "buyerId"
        , eo.currency
        , eo.commission
        , o.buyer_email::reverb.email_address AS "buyerEmail"
        , su.test_mode AS "testMode"
        , 'external-order'::text AS "type"
      FROM
        reverb.external_order eo
        JOIN reverb.shared_url_access sua on eo.shared_url_access_id = sua._id
        JOIN reverb.shared_url su on sua.shared_url_id = su._id
        LEFT JOIN reverb."order" o on eo.client_order_id = o.client_order_id
    WHERE
      
      eo.client_id IN (
        
        select
          client_id
        from
        (
          
          select
            client_id,
            now() >= max(assocI.connected_at) and now() <= max(case when assocI.disconnected_at is null then '3000-01-01'::date else assocI.disconnected_at end) as "connected"
          from
            reverb.assoc_affiliate_merchant_client assocI
          group by
            client_id
                    
        ) a1
        WHERE 
        a1.connected = true
      )
    ),

    joined_orders AS (
  		SELECT * FROM soreto_orders 
		UNION 
    	SELECT * FROM external_orders
    )

    SELECT
      orders.*
      , c.name AS "clientName",
      (SELECT reverb.func_get_var('POST_REWARD_VERSION', 'POST_REWARD', orders."clientId")) AS "postRewardVersion"
      FROM
        joined_orders orders
        JOIN reverb.client c ON orders."clientId" = c."_id"
    `);
};