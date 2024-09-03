exports.seed = function(knex) {
  return knex.raw(`
        
        DROP VIEW IF EXISTS reverb.agg_campaign_reward_pool_js;
      
        CREATE OR REPLACE VIEW reverb.agg_campaign_reward_pool_js AS
        select 
            cp.client_id as "clientId",
            cp.description as "campaignName",
            cp.expiry,
            cp.short_url_custom_string_component as "shortUrlCustomStringComponent",
            cp.type as "type",
            cpv."_id" as "campaignVersionId",
            cpv."name" as "campaignVersionName",
            cpv.link_expiry_days as "linkExpiryDays",
            cpv.private_link_expiry_days as "privateLinkExpiryDays",
            cpv.public_shared_url_expires_at as "publicSharedUrlExpiresAt",
	        cpv.private_shared_url_expires_at as "privateSharedUrlExpiresAt",
            cpv.reward_pool_dynamic_enabled as "rewardPoolDynamicEnabled",
            cpv.mp_offer_title as "mpOfferTitle",
            rp._id as "rewardPoolId",
            rp.advocate_pre_conversion_reward_id as "sharerPreReward",
            rp.advocate_post_conversion_reward_id as "sharerPostReward",
            rp.referee_reward_id as "friendPreReward",
            rp.friend_post_reward_id as "friendPostReward",
            rp.post_reward_per_user as "sharerPostRewardPerUser",
            rp.friend_post_reward_per_user as "friendPostRewardPerUser",            
            rpd._id as "rewardPoolDynamicId",
            rpd.sharer_pre_reward_group_id as "sharerPreRewardGroupId",
            rpd.sharer_post_reward_group_id as "sharerPostRewardGroupId",
            rpd.friend_pre_reward_group_id as "friendPreRewardGroupId",
            rpd.friend_post_reward_group_id as "friendPostRewardGroupId",
            (SELECT reverb.func_get_var('POST_REWARD_VERSION', 'CAMPAIGN_VERSION.POST_REWARD', cpv."_id")) as "postRewardVersion"
        from
            reverb.campaign cp
            left join
            reverb.campaign_version cpv
            on
            cp."_id" = cpv.campaign_id
            left join
            reverb.reward_pool rp
            on
            cpv.reward_pool_id = rp."_id"
            left join 
            reverb.reward_pool_dynamic rpd 
            on
            cpv.reward_pool_dynamic_id = rpd."_id"
        `);
};