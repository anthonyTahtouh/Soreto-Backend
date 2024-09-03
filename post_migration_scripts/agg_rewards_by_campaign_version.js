exports.seed = knex => knex.raw(`
  CREATE OR REPLACE VIEW reverb.agg_reward_by_campaign_version_js AS 
    select
      c._id as "campaignId",
      cpv._id as "campaignVersionId",
      cpv.reward_pool_id as "rewardPoolId",
      r._id as "rewardId",
      r.name as "rewardName",
      r.type as "rewardType",
      r.meta as "rewardMeta"
      
    from
      reverb.campaign c
      join reverb.campaign_version cpv on cpv.campaign_id = c._id
      join reverb.reward_pool rp on cpv.reward_pool_id = rp._id
      join reverb.reward r on rp.advocate_pre_conversion_reward_id  = r._id
        or rp.advocate_post_conversion_reward_id  = r._id
        or rp.referee_reward_id  = r._id 
        or rp.friend_post_reward_id  = r._id  
`);
