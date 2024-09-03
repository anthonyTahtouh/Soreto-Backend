export function up(knex) {

  var query = `
          
      ALTER TABLE reverb.reward_group 
      RENAME TO reward_group_item;
      
      ALTER TABLE reverb.reward_group_item
      ADD COLUMN "_id" text NOT NULL DEFAULT reverb.generate_object_id() PRIMARY KEY;
            
      drop view if exists reverb.reward_group_js;
      CREATE TABLE reverb.reward_group (
          "_id" text NOT NULL DEFAULT reverb.generate_object_id() PRIMARY KEY,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          name TEXT NOT NULL,
          client_id TEXT NOT NULL references reverb.client("_id")
      );
      
      update reverb.reward_pool_dynamic set sharer_pre_reward_group_id = null, sharer_post_reward_group_id = null, friend_pre_reward_group_id = null, friend_post_reward_group_id = null;
      delete from reverb.reward_group_item;

      update reverb.campaign_version set reward_pool_dynamic_id = null;
      delete from reverb.reward_pool_dynamic;
      
      ALTER TABLE reverb.reward_pool_dynamic 
      ADD COLUMN client_id TEXT NOT NULL references reverb.client ("_id"),
      ADD CONSTRAINT FK_SHARER_PRE_GROUP FOREIGN KEY (sharer_pre_reward_group_id) REFERENCES reverb.reward_group ("_id"),
      ADD CONSTRAINT FK_SHARER_POST_GROUP FOREIGN KEY (sharer_post_reward_group_id) REFERENCES reverb.reward_group ("_id"),
      ADD CONSTRAINT FK_FRIEND_PRE_GROUP FOREIGN KEY (friend_pre_reward_group_id) REFERENCES reverb.reward_group ("_id"),
      ADD CONSTRAINT FK_FRIEND_POST_GROUP FOREIGN KEY (friend_post_reward_group_id) REFERENCES reverb.reward_group ("_id");

      ALTER TABLE reverb.order_post_reward
      ADD CONSTRAINT FK_REWARD_GROUP FOREIGN KEY (reward_group_id) REFERENCES reverb.reward_group ("_id");
      
      select reverb.create_view_table_js('reverb.reward_group_item');
      select reverb.create_view_table_js('reverb.reward_group');
      select reverb.create_view_table_js('reverb.reward_pool_dynamic');
      select reverb.create_view_table_js('reverb.order_post_reward');
     `;

  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
  
        DROP VIEW IF EXISTS reverb.reward_pool_dynamic_js;
        DROP VIEW IF EXISTS reverb.reward_group_js;
        DROP VIEW IF EXISTS reverb.reward_group_item_js;
        DROP VIEW IF EXISTS reverb.agg_shared_url_post_reward_js;
        
        ALTER TABLE reverb.reward_pool_dynamic
        DROP COLUMN client_id,
        DROP CONSTRAINT fk_sharer_pre_group,
        DROP CONSTRAINT fk_sharer_post_group,
        DROP CONSTRAINT fk_friend_pre_group,
        DROP CONSTRAINT fk_friend_post_group;

        ALTER TABLE reverb.order_post_reward
        DROP CONSTRAINT fk_reward_group;
        
        DROP TABLE reverb.reward_group;
        
        ALTER TABLE reverb.reward_group_item RENAME TO reward_group;

        ALTER TABLE reverb.reward_group
        DROP COLUMN IF EXISTS "_id";
        
        select reverb.create_view_table_js('reverb.reward_group');
        select reverb.create_view_table_js('reverb.reward_pool_dynamic');  
          
      `;

  return knex.schema.raw(query);
}