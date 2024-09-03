export function up(knex) {
  var query = `
              ALTER TABLE reverb.reward_pool
                ADD COLUMN friend_post_reward_id TEXT,
                ADD COLUMN friend_post_reward_per_user INT,
                ADD CONSTRAINT fk_friend_post_reward FOREIGN KEY (friend_post_reward_id)
                    REFERENCES reverb.reward (_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

              SELECT reverb.create_view_table_js('reverb.reward_pool');
              `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
              DROP VIEW reverb.reward_pool_js;
        
              ALTER TABLE reverb.reward_pool
                DROP CONSTRAINT IF EXISTS fk_friend_post_reward,
                DROP COLUMN IF EXISTS friend_post_reward_per_user,
                DROP COLUMN IF EXISTS friend_post_reward_id;
        
              SELECT reverb.create_view_table_js('reverb.reward_pool');
            `;
  return knex.schema.raw(query);
}