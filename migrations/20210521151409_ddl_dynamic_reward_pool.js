export function up(knex) {

  var query = `
      
    -- REWARD POOL DYNAMIC
    CREATE TABLE reverb.reward_pool_dynamic (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id() PRIMARY KEY,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            name text not null,
            sharer_pre_reward_group_id text DEFAULT reverb.generate_object_id() unique,
            sharer_post_reward_group_id text DEFAULT reverb.generate_object_id() unique,
            friend_pre_reward_group_id text DEFAULT reverb.generate_object_id() unique,
            friend_post_reward_group_id text DEFAULT reverb.generate_object_id() unique
    );
        
    select reverb.create_view_table_js('reverb.reward_pool_dynamic');
    
    -- REWARD GROUP
    CREATE TABLE reverb.reward_group (
      group_id text NOT NULL
      , reward_id text not null REFERENCES reverb.reward (_id)
      , alias text NOT NULL
      , rules JSONB
      , active boolean DEFAULT true
      , visible boolean DEFAULT true
      , unique(group_id, reward_id)
    );
    
    select reverb.create_view_table_js('reverb.reward_group');
    
    -- CAMPAIGN VERSION
    ALTER TABLE reverb.campaign_version ADD COLUMN reward_pool_dynamic_id TEXT REFERENCES reverb.reward_pool_dynamic (_id);
    ALTER TABLE reverb.campaign_version ADD COLUMN reward_pool_dynamic_enabled BOOLEAN default false;
    SELECT reverb.create_view_table_js('reverb.campaign_version');
  
 `;

  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
    drop view if exists reverb.reward_group_js, reverb.reward_pool_dynamic_js, reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version DROP COLUMN IF EXISTS reward_pool_dynamic_id;
    ALTER TABLE reverb.campaign_version DROP COLUMN IF EXISTS reward_pool_dynamic_enabled;
    select reverb.create_view_table_js('reverb.campaign_version');
    
    drop table IF EXISTS reverb.reward_group;
    drop table IF EXISTS reverb.reward_pool_dynamic;
  `;

  return knex.schema.raw(query);
}