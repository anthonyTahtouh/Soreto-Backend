
exports.seed = function(knex) {
  return knex.raw(`
  
    DROP VIEW IF EXISTS reverb.agg_shared_url_post_reward_js;
  
    CREATE VIEW reverb.agg_shared_url_post_reward_js AS
  
    select 
        su._id,
        su.created_at,
        cv.link_expiry_days,
        (su.created_at + cv.link_expiry_days * INTERVAL '1 day')::date "expiredDate",
        (su.created_at + cv.link_expiry_days * INTERVAL '1 day')::date < now()::date as expired,
        su."type",
        rp.advocate_post_conversion_reward_id AS "sharerPostRewardId",
        rp.friend_post_reward_id AS "friendPostRewardId",
        rgi.reward_id as "dinamicRewardId",
        meta->>'assignedCodeId' as "assignedCodeId",
        meta->>'assignedCodes' as "assignedCodes"        
    from 
        reverb.shared_url su
        left join
        reverb.campaign_version cv
        on
        su.campaign_version_id = cv."_id"
        left join
        reverb.reward_pool rp
        on
        cv.reward_pool_id = rp."_id"
        left join
        reverb.reward_pool_dynamic rpd
        on
        cv.reward_pool_dynamic_id = rpd."_id"
        left join
        reverb.reward_group rg
        on
        rpd.friend_post_reward_group_id = rg."_id"
        or
        rpd.sharer_post_reward_group_id  = rg."_id"
        left join
        reverb.reward_group_item rgi
        on 
        rgi.group_id = rg."_id"
    where
        su."type" = 'SHARER_POST_REWARD'
        OR
        su."type" = 'FRIEND_POST_REWARD'

    `);
};
