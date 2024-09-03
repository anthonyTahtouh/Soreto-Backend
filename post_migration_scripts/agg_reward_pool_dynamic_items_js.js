exports.seed = function (knex) {
  return knex.raw(`

  DROP VIEW IF EXISTS reverb.agg_reward_pool_dynamic_items_js;

  CREATE VIEW reverb.agg_reward_pool_dynamic_items_js AS
  
  SELECT rpd._id,
        rpd.name AS name,
        rpd.client_id AS "clientId",
        client.name AS "clientName",
        (select json_agg(item) from (select rgi.*, rw.name from reverb.reward_group rg
        			left join reverb.reward_group_item rgi on rgi.group_id = rg._id
        			join reverb.reward rw on rw._id = rgi.reward_id
        		where rg._id = rpd.sharer_pre_reward_group_id) as item) as sharer_pre_reward_items, 
        (select json_agg(item) from (select rgi.*, rw.name from reverb.reward_group rg
        			left join reverb.reward_group_item rgi on rgi.group_id = rg._id
        			join reverb.reward rw on rw._id = rgi.reward_id
        		where rg._id = rpd.sharer_post_reward_group_id) as item) as sharer_post_rewards_items,
        (select json_agg(item) from (select rgi.*, rw.name from reverb.reward_group rg
        			left join reverb.reward_group_item rgi on rgi.group_id = rg._id
        			join reverb.reward rw on rw._id = rgi.reward_id
        		where rg._id = rpd.friend_pre_reward_group_id) as item) as friend_pre_reward_items,
        (select json_agg(item) from (select rgi.*, rw.name from reverb.reward_group rg
        			left join reverb.reward_group_item rgi on rgi.group_id = rg._id
        			join reverb.reward rw on rw._id = rgi.reward_id
        		where rg._id = rpd.friend_post_reward_group_id) as item) as friend_post_reward_items
   FROM reverb.reward_pool_dynamic rpd
      JOIN reverb.client client ON rpd.client_id = client._id 
  `);
};
