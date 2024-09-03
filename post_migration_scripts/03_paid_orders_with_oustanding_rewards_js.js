
exports.seed = function(knex) {
  return knex.raw(`
  
  DROP VIEW IF EXISTS reverb.agg_orders_joined_js;
  DROP VIEW IF EXISTS reverb.paid_orders_with_oustanding_rewards_js;
    
  CREATE OR REPLACE VIEW reverb.paid_orders_with_oustanding_rewards_js AS

  WITH v_orders AS (
    SELECT
      order_id,
      order_status,
      order_type,
      joined_orders.client_id,
      shared_url_id,      
      reward_pool.advocate_post_conversion_reward_id,
      reward_pool.friend_post_reward_id,      
      sharer_id,
      sharer.email AS sharer_email,
      sharer.first_name AS sharer_name,
      buyer_id,
      buyer_email,
      buyer.first_name as buyer_name,
      campaign_version_id,
      reward_pool.post_reward_per_user,
      reward_pool.friend_post_reward_per_user,
      order_date,
      override_campaign_version_id,
      override_reward_pool.advocate_post_conversion_reward_id as override_advocate_post_conversion_reward_id,
      override_reward_pool.friend_post_reward_id as override_friend_post_reward_id,
      override_reward_pool.post_reward_per_user as override_post_reward_per_user,
	  override_reward_pool.friend_post_reward_per_user as override_friend_post_reward_per_user

    FROM
      (
		      SELECT
		        orders._id AS order_id,
		        status AS order_status,
		        sharer_id,
		        coalesce(buyer."_id", coalesce(buyerSession."_id", orders.buyer_id )) AS buyer_id,
		        coalesce(info.email, coalesce(shared_session.email, orders.buyer_email )) AS buyer_email,    
		        'order' AS order_type,
		        orders.client_id,
		        orders.meta->> 'sharedUrlId' AS shared_url_id,
	          orders.created_at AS order_date,
    	      orders.override_campaign_version_id
		      FROM
		        reverb."order" orders
		        LEFT JOIN reverb.shared_url_access url_access ON orders.shared_url_access_id = url_access._id
		        LEFT JOIN reverb.shared_url_access_user_info info ON url_access."_id" = info.shared_url_access_id
		        LEFT JOIN reverb."user" buyer ON buyer.email = info.email
		        
				LEFT JOIN (
				
		            SELECT 
		              shared_url_access_session._id as _id,
		              shared_url_access_session.shared_url_id as shared_url_id,
		              shared_url_access_session.session_id as session_id,
		              info_session.email as email
		            FROM reverb.shared_url_access shared_url_access_session			
		            
		              inner join reverb.shared_url_access_user_info info_session 
		                on info_session.shared_url_access_id = shared_url_access_session._id 
		                and info_session.shared_url_id = shared_url_access_session.shared_url_id				
		                
		            WHERE info_session.email is not null and shared_url_access_session.session_id is not null
		            
		            ORDER BY shared_url_access_session.created_at desc
		            
		            LIMIT 1
		            
		          ) shared_session
		        on shared_session.session_id = url_access.session_id and shared_session.shared_url_id = url_access.shared_url_id 
		
		        LEFT JOIN reverb."user" buyerSession ON buyerSession.email = shared_session.email
		    UNION
		      SELECT
		        orders._id AS order_id,
		        status AS order_status,
		        url.user_id AS sharer_id,
		        coalesce(buyer."_id", buyerSession."_id") AS buyer_id,
		        coalesce(info.email, shared_session.email) AS buyer_email,
		        'external-order' AS order_type,
		        orders.client_id,
		        url_access.shared_url_id AS shared_url_id,
	          orders.transacted_at AS order_date,
	          url_access.override_campaign_version_id
		      FROM
		        reverb.external_order orders
		        LEFT JOIN reverb.shared_url_access url_access ON orders.shared_url_access_id = url_access._id
		        JOIN reverb.shared_url url ON url_access.shared_url_id = url._id
		        LEFT JOIN reverb.shared_url_access_user_info info ON url_access."_id" = info.shared_url_access_id
		        LEFT JOIN reverb."user" buyer ON buyer.email = info.email
		            
		        LEFT JOIN (
		            SELECT 
		              shared_url_access_session._id as _id,
		              shared_url_access_session.shared_url_id as shared_url_id,
		              shared_url_access_session.session_id as session_id,
		              info_session.email as email
		            FROM reverb.shared_url_access shared_url_access_session			
		            
		              inner join reverb.shared_url_access_user_info info_session 
		                on info_session.shared_url_access_id = shared_url_access_session._id 
		                and info_session.shared_url_id = shared_url_access_session.shared_url_id				
		                
		            WHERE info_session.email is not null
		              and shared_url_access_session.session_id is not null
		            ORDER BY shared_url_access_session.created_at desc
		            LIMIT 1
		          ) shared_session
		        on shared_session.session_id = url_access.session_id and shared_session.shared_url_id = url_access.shared_url_id 
		
		        LEFT JOIN reverb."user" buyerSession ON buyerSession.email = shared_session.email
      ) AS joined_orders

      
        JOIN reverb."user" sharer ON sharer._id = joined_orders.sharer_id
        left JOIN reverb."user" buyer ON buyer._id = joined_orders.buyer_id
        JOIN reverb.shared_url url ON joined_orders.shared_url_id = url._id
        JOIN reverb.campaign_version campaign_version ON campaign_version._id = url.campaign_version_id
        JOIN reverb.reward_pool reward_pool ON campaign_version.reward_pool_id = reward_pool._id
        LEFT JOIN reverb.campaign_version override_campaign_version ON override_campaign_version._id = joined_orders.override_campaign_version_id
        LEFT JOIN reverb.reward_pool override_reward_pool ON override_campaign_version.reward_pool_id = override_reward_pool._id
        
    WHERE

      -- FILTER BY CLIENTS WITH NO BLOCKED POST REWARDS
	    (
	    	(SELECT reverb.func_get_var('POST_REWARD_BLOCKED', 'POST_REWARD', joined_orders.client_id)) = 'false' 
        OR 
        (SELECT reverb.func_get_var('POST_REWARD_BLOCKED', 'POST_REWARD', joined_orders.client_id)) IS NULL
      ) = TRUE
	    AND
	    -- FILTER BY CLIENTS THAT USE THE POST REWARD VERSION 1
      (SELECT reverb.func_get_var('POST_REWARD_VERSION', 'CAMPAIGN_VERSION.POST_REWARD', coalesce(override_campaign_version_id, campaign_version_id) )) = '1'
      AND
	    -- FILTER BY ALLOWED ORDER STATUS BY CLIENT CONFIGURATION
      joined_orders.order_status IN (SELECT reverb.func_get_var('ALLOWED_ORDER_STATUS', 'POST_REWARD', joined_orders.client_id) AS f)
      AND
      url.test_mode = false
      AND
      CASE
        WHEN joined_orders.order_type = 'order' THEN
          joined_orders.client_id NOT IN (SELECT DISTINCT(client_id) FROM reverb.assoc_affiliate_merchant_client)-- This is really necessary?
          AND NOT EXISTS(SELECT order_id FROM reverb.process_post_conversion_reward process WHERE process.order_id = joined_orders.order_id AND process.process_status = 'process-complete')
        ELSE
          joined_orders.client_id IN (SELECT DISTINCT(client_id) FROM reverb.assoc_affiliate_merchant_client) -- This is really necessary?
          AND NOT EXISTS(SELECT external_order_id FROM reverb.process_post_conversion_reward process WHERE process.external_order_id = joined_orders.order_id AND process.process_status = 'process-complete')
      END ),
      
    order_post_reward_count AS (
    SELECT
      process.reward_id,
      urls.user_id,
      COUNT(1) "count"
    FROM
      reverb.process_post_conversion_reward process
      JOIN reverb."order" AS orders ON process.order_id = orders._id
      JOIN reverb.shared_url urls ON orders.meta ->> 'sharedUrlId'::TEXT = urls._id
	    JOIN reverb.process_post_conversion_reward rewarded_process on process.process_id = rewarded_process.process_id
    WHERE
      process.process_status = 'process-complete' 
      AND process.order_id IS NOT NULL
      AND ( rewarded_process.process_status = 'batch-discount-assigned-rewards' OR rewarded_process.process_status = 'discount-started-post-process' )
    GROUP BY
      process.reward_id,
      urls.user_id ),
    external_order_post_reward_count AS (
    SELECT
      process.reward_id,
      urls.user_id,
      COUNT(1) "count"
    FROM
      reverb.process_post_conversion_reward process
      JOIN reverb.external_order AS orders ON process.external_order_id = orders._id
      LEFT JOIN reverb.shared_url_access url_access ON orders.shared_url_access_id = url_access._id
      JOIN reverb.shared_url urls ON url_access.shared_url_id = urls._id
  	  JOIN reverb.process_post_conversion_reward rewarded_process on process.process_id = rewarded_process.process_id
    WHERE
      process.process_status = 'process-complete'
      AND process.external_order_id IS NOT NULL
      AND ( rewarded_process.process_status = 'batch-discount-assigned-rewards' OR rewarded_process.process_status = 'discount-started-post-process' )
    GROUP BY
      process.reward_id,
      urls.user_id ) 
      
      
    -- * * * * * * * * * * MAIN QUERY * * * * * * * * * *
    SELECT
      final_query.user_id AS "userId",
      post_reward_type AS "postRewardType",
      order_type AS "orderType",
      email,
      userName AS "userName",
	    sharer_id AS "sharerUserId",
      buyer_id AS "buyerUserId",
      reward_type AS "rewardType",
      final_query.reward_id AS "rewardId",
      order_id AS "orderId",
      campaign_version_id,
      shared_url_id AS "sharedUrlId",
      post_reward_per_user AS "postRewardPerUser",
      order_date AS "orderDate",
      override_campaign_version_id,
      COALESCE(CASE WHEN order_type = 'order' THEN order_count."count" ELSE external_order_count."count" END, 0) AS "earnedRewardsPerUser"
    FROM
      (
      SELECT
        orders.sharer_id AS user_id,
        orders.sharer_email AS email,
        orders.sharer_name as userName,
        orders.sharer_id AS sharer_id,
        orders.buyer_id AS buyer_id,
        orders.order_type,
        orders.order_id,
        orders.campaign_version_id,
        orders.shared_url_id,
        orders.post_reward_per_user,
        post_reward.type AS reward_type,
        post_reward."_id" AS reward_id,
        order_date,
        override_campaign_version_id,
        'SHARER' AS post_reward_type
      FROM
        v_orders orders
        JOIN reverb.reward post_reward ON post_reward._id = orders.advocate_post_conversion_reward_id
    UNION ALL
      SELECT
        orders.buyer_id AS user_id,
        orders.buyer_email AS email,
        orders.buyer_name AS userName,
        orders.sharer_id AS sharer_id,
        orders.buyer_id AS buyer_id,      
        orders.order_type,
        orders.order_id,
		    coalesce(orders.override_campaign_version_id, orders.campaign_version_id) as campaign_version_id,
        orders.shared_url_id,
		    coalesce(orders.override_friend_post_reward_per_user, orders.friend_post_reward_per_user) as campaign_version_id,        		
        post_reward.type AS reward_type,
        post_reward."_id" AS reward_id,
        order_date,
        override_campaign_version_id,
        'FRIEND' AS post_reward_type
      FROM
        v_orders orders
        JOIN reverb.reward post_reward ON post_reward._id = coalesce(orders.override_friend_post_reward_id, orders.friend_post_reward_id)
      ) final_query
      
      LEFT JOIN order_post_reward_count order_count ON final_query.user_id = order_count.user_id AND final_query.reward_id = order_count.reward_id
      LEFT JOIN external_order_post_reward_count external_order_count ON final_query.user_id = external_order_count.user_id AND final_query.reward_id = external_order_count.reward_id 
      
      ORDER BY "orderType" DESC`);
};
