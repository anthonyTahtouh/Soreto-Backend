
exports.up = function(knex) {

  let query = `

        CREATE TYPE reverb.ORDER_USER_ROLE AS ENUM (
            'SHARER',
            'BUYER'
        );

        CREATE TABLE reverb.order_post_reward (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            order_id text,
            external_order_id text,
            campaign_version_id text NOT NULL,
            reward_pool_id text NOT NULL,
            user_id text references reverb.user("_id"),
            order_user_role reverb.ORDER_USER_ROLE,
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            reward_id text references reverb.reward("_id"),
            shared_url_id text references reverb.shared_url("_id"),
            status text,
            processed boolean NOT NULL,
            CONSTRAINT order_post_reward_pkey PRIMARY KEY (_id),
            FOREIGN KEY (order_id) REFERENCES reverb.order("_id"),
            FOREIGN KEY (campaign_version_id) REFERENCES reverb.campaign_version("_id"),
            FOREIGN KEY (external_order_id) REFERENCES reverb.external_order("_id"),
            FOREIGN KEY (reward_pool_id) REFERENCES reverb.reward_pool("_id")
        );

        CREATE TABLE reverb.order_post_reward_log (
            "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
            order_post_reward_id text references reverb.order_post_reward("_id"),
            created_at timestamp with time zone NOT NULL DEFAULT now(),
            step text,
            log text,
            error boolean
        );

        -- create views
        select reverb.create_view_table_js('reverb.order_post_reward');
        select reverb.create_view_table_js('reverb.order_post_reward_log');
    
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `
        DROP VIEW IF EXISTS reverb.agg_order_post_reward_js;
        DROP VIEW IF EXISTS reverb.agg_order_campaign_version_js;
        DROP VIEW IF EXISTS reverb.order_post_reward_js;
        DROP VIEW IF EXISTS reverb.order_post_reward_log_js;
        DROP TABLE reverb.order_post_reward_log;      
        DROP TABLE reverb.order_post_reward;
        DROP TYPE reverb.ORDER_USER_ROLE;
    `;

  return knex.schema.raw(query);
};
