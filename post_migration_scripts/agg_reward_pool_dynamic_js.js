exports.seed = function (knex) {
  return knex.raw(`

  DROP VIEW IF EXISTS reverb.agg_reward_pool_dynamic_js;

  CREATE VIEW reverb.agg_reward_pool_dynamic_js AS
  
  SELECT reward_pool_dynamic._id,
        reward_pool_dynamic .name AS name,
        reward_pool_dynamic.client_id AS "clientId",
        client.name AS "clientName",
        reward_pool_dynamic.created_at AS "createdAt",
        reward_pool_dynamic.updated_at AS "updatedAt"
   FROM reverb.reward_pool_dynamic reward_pool_dynamic
      JOIN reverb.client client ON reward_pool_dynamic.client_id = client._id
    ORDER BY reward_pool_dynamic.updated_at DESC
  `);
};
