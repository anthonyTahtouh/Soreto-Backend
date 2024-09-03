export function up(knex) {
  var query = `  
                ALTER TABLE reverb.process_post_conversion_reward
                  ADD COLUMN type reverb.POST_REWARD_TYPE DEFAULT 'SHARER' NOT NULL,
                  ADD COLUMN target_user_id TEXT,
                  ADD COLUMN target_email TEXT;
  
                  SELECT reverb.create_view_table_js('reverb.process_post_conversion_reward');
                `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `  
                DROP VIEW IF EXISTS reverb.process_post_conversion_reward_js;
                DROP VIEW IF EXISTS reverb.paid_orders_with_oustanding_rewards_js;
                DROP VIEW IF EXISTS reverb.agg_process_post_conversion_reward_user_email_js;
  
                ALTER TABLE reverb.process_post_conversion_reward
                  DROP COLUMN IF EXISTS type,
                  DROP COLUMN IF EXISTS target_user_id,
                  DROP COLUMN IF EXISTS target_email;
  
                SELECT reverb.create_view_table_js('reverb.process_post_conversion_reward');
              `;
  return knex.schema.raw(query);
}


