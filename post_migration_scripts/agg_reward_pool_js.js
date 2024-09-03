
exports.seed = function(knex) {
  return knex.raw(`

    DROP VIEW IF EXISTS reverb.agg_reward_pool_js;

    CREATE VIEW reverb.agg_reward_pool_js AS

    SELECT reward_pool._id,
        reward_pool.created_at AS "createdAt",
        reward_pool.updated_at AS "updatedAt",
        reward_pool.advocate_pre_conversion_reward_id AS "advocatePreConversionRewardId",
	reward_advocate_pre.name AS "advocatePreConversionRewardName",
        reward_pool.advocate_post_conversion_reward_id AS "advocatePostConversionRewardId",
	reward_advocate_post.name AS "advocatePostConversionRewardName",
        reward_pool.referee_reward_id AS "refereeRewardId",
        reward_friend_post.name AS "friendPostRewardName",
	reward_referee.name AS "refereeRewardName",
        reward_pool.client_id AS "clientId",
        client.name AS "clientName",
        reward_pool.name,
        reward_pool.archived
      FROM reverb.reward_pool reward_pool
        JOIN reverb.client client ON reward_pool.client_id = client._id
        LEFT JOIN reverb.reward reward_advocate_pre on reward_pool.advocate_pre_conversion_reward_id = reward_advocate_pre._id
        LEFT JOIN reverb.reward reward_advocate_post on reward_pool.advocate_post_conversion_reward_id = reward_advocate_post._id
        LEFT JOIN reverb.reward reward_friend_post on reward_pool.friend_post_reward_id = reward_friend_post._id
        LEFT JOIN reverb.reward reward_referee on reward_pool.referee_reward_id = reward_referee._id;
  `);
};
