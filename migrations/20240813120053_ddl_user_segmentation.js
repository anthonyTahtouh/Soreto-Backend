
exports.up = function(knex) {
  var query = `   
        create table 
            reverb.user_segmentation_score (
                _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                name text NOT null UNIQUE,
                description text,
                "type" text NOT NULL,
                client_id text REFERENCES reverb.client(_id),
                "expression" text NOT NULL
            );

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.user_segmentation_score');

        create table 
            reverb.user_segmentation (
                _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                name text NOT null UNIQUE,
                description text,
                client_id text REFERENCES reverb.client(_id)      	
            );

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.user_segmentation');

        create table 
            reverb.user_segmentation_score_group (
                _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                user_segmentation_id text NOT null REFERENCES reverb.user_segmentation(_id),
                user_segmentation_score_id text NOT null REFERENCES reverb.user_segmentation_score(_id),
                user_segmentation_score_or_group_id text,
                CONSTRAINT user_segmentation_score_key UNIQUE (user_segmentation_id, user_segmentation_score_id)
            );

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.user_segmentation_score_group');


        create table
            reverb.user_segmentation_pool (
                _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                name text NOT null,		
                description text NOT null,
                client_id text REFERENCES reverb.client(_id)
            );

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.user_segmentation_pool');

        create table
            reverb.user_segmentation_pool_group (
                _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
                created_at timestamp with time zone NOT NULL DEFAULT now(),
                updated_at timestamp with time zone NOT NULL DEFAULT now(),
                user_segmentation_id text NOT null REFERENCES reverb.user_segmentation(_id),		
                user_segmentation_pool_id text NOT null REFERENCES reverb.user_segmentation_pool(_id),
                rank integer not null
            );

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.user_segmentation_pool_group');

        alter table
            reverb.campaign 
            add column user_segmentation_pool_id text REFERENCES reverb.user_segmentation_pool(_id);

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.campaign');

      `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `   
        -- DROP MIRROR VIEW
        drop view if exists reverb.agg_campaign_version_configuration_js;
        drop view if exists agg_mp_offer_js;
        drop view if exists reverb.campaign_js;

        alter table campaign drop column user_segmentation_pool_id;

        -- MIRROR VIEW
        select reverb.create_view_table_js('reverb.campaign');


        -- DROP MIRROR VIEW
        drop view if exists reverb.user_segmentation_pool_group_js;
        drop view if exists reverb.agg_user_segmentation_pool_group_js;
        drop view if exists reverb.agg_user_segmentation_pool_js;

        drop table reverb.user_segmentation_pool_group;


        -- DROP MIRROR VIEW
        drop view if exists reverb.user_segmentation_pool_js;

        drop table reverb.user_segmentation_pool;


        -- DROP MIRROR VIEW
        drop view if exists reverb.user_segmentation_score_group_js;
        drop view if exists reverb.agg_user_segmentation_js;

        drop table reverb.user_segmentation_score_group;

        -- DROP MIRROR VIEW
        drop view if exists reverb.user_segmentation_js;

        drop table reverb.user_segmentation;


        -- DROP MIRROR VIEW
        drop view if exists reverb.user_segmentation_score_js;
        drop view if exists reverb.agg_user_segmentation_score_js;

        drop table reverb.user_segmentation_score;

      `;
  return knex.raw(query);
};
