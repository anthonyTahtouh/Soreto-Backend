export function up(knex) {

  var query = `
        
        alter table reverb.order_post_reward
        ADD COLUMN reward_pool_dynamic_id TEXT REFERENCES reverb.reward_pool_dynamic (_id),
        ADD COLUMN reward_group_id TEXT;

        SELECT reverb.create_view_table_js('reverb.order_post_reward');
   `;

  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `

        DROP VIEW IF EXISTS reverb.agg_order_post_reward_js;
        DROP VIEW IF EXISTS reverb.order_post_reward_js;

        alter table reverb.order_post_reward
        DROP COLUMN IF EXISTS reward_pool_dynamic_id,
        DROP COLUMN IF EXISTS reward_group_id;

        SELECT reverb.create_view_table_js('reverb.order_post_reward');
    `;

  return knex.schema.raw(query);
}