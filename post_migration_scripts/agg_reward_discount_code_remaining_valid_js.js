exports.seed = function(knex) {
  return knex.raw(`

  DROP VIEW IF EXISTS reverb.agg_reward_discount_code_remaining_valid_js;

  CREATE OR REPLACE VIEW reverb.agg_reward_discount_code_remaining_valid_js AS
 
  SELECT
  		"clientName",
  		"rewardId" , 
	 	  "rewardName",
  		"totalRemaining",
	  	"usedLast30Days",
  		"daysLeft",
		  "expiryDate"
  FROM 
  (SELECT 
  		reward.client_id "clientId",
  		client."name" "clientName",
  		reward._id "rewardId" , 
	 	  reward.name "rewardName",
  		sum(CASE WHEN rdc.attributed_user_id IS NULL THEN 1 ELSE 0 END) "totalRemaining",
	  	sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END) "usedLast30Days",
  		(
			CASE WHEN 	
  				((sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END))::decimal / 30) > 0
			THEN
				(sum(CASE WHEN rdc.attributed_user_id IS NULL THEN 1 ELSE 0 END) /
				((sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END))::decimal / 30))::INT
	 		ELSE
	 			0
 			END
  		) "daysLeft",
		  max(rdc.valid_to)::date "expiryDate"
  FROM reverb.client client
  JOIN reverb.campaign campaign ON client._id = campaign.client_id
  JOIN reverb.campaign_version "version" ON campaign._id = "version".campaign_id
  JOIN reverb.reward_pool reward_pool ON "version".reward_pool_id = reward_pool._id
  JOIN reverb.reward reward ON
      (reward._id = reward_pool.advocate_pre_conversion_reward_id OR
       reward._id = reward_pool.advocate_post_conversion_reward_id OR
       reward._id = reward_pool.referee_reward_id or
       reward._id = reward_pool.friend_post_reward_id)
  LEFT JOIN reverb.reward_discount_code rdc ON reward._id = rdc.reward_id
  WHERE 
  	version.reward_pool_dynamic_id IS NULL AND 
  	version.reward_pool_dynamic_enabled IS FALSE AND
    client.active = true AND
    campaign.active = true AND
    "version".active = true AND
    reward.type = 'batch-discount'
  GROUP BY reward._id, reward.name, "clientName", reward.client_id
  UNION ALL
  SELECT
  		reward.client_id "clientId",
  		client."name" "clientName",
  		reward._id "rewardId" , 
	 	  reward.name "rewardName",
  		sum(CASE WHEN rdc.attributed_user_id IS NULL THEN 1 ELSE 0 END) "totalRemaining",
	  	sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END) "usedLast30Days",
  		(
			CASE WHEN 	
  				((sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END))::decimal / 30) > 0
			THEN
				(sum(CASE WHEN rdc.attributed_user_id IS NULL THEN 1 ELSE 0 END) /
				((sum(CASE WHEN (rdc.attributed_user_id IS NOT NULL ) AND (rdc.updated_at::date > (current_date - interval '30' day)::date) THEN 1 ELSE 0 END))::decimal / 30))::INT
	 		ELSE
	 			0
 			END
  		) "daysLeft",
		  max(rdc.valid_to)::date "expiryDate"
  FROM reverb.client client
  JOIN reverb.campaign campaign ON client._id = campaign.client_id
  JOIN reverb.campaign_version "version" ON campaign._id = "version".campaign_id
  JOIN reverb.reward_pool_dynamic rpd ON version.reward_pool_dynamic_id = rpd."_id" 
  JOIN reverb.reward_group rg ON (rg._id = rpd.sharer_pre_reward_group_id or
                                  rg._id = rpd.sharer_post_reward_group_id or
                                  rg._id = rpd.friend_pre_reward_group_id or
                                  rg._id = rpd.friend_post_reward_group_id )
  JOIN reverb.reward_group_item rgi ON (rgi.group_id = rg."_id")
  JOIN reverb.reward reward ON (reward._id = rgi.reward_id)
  LEFT JOIN reverb.reward_discount_code rdc ON reward._id = rdc.reward_id
  WHERE 
    version.reward_pool_dynamic_id is not null AND
  	version.reward_pool_dynamic_enabled is true AND
    client.active = TRUE AND
    campaign.active = TRUE AND
    "version".active = TRUE AND
    reward.type = 'batch-discount'
  GROUP BY 
    reward._id, reward.name, "clientName", reward.client_id
  ) union_query
    ORDER BY "clientId"
  `);
};
