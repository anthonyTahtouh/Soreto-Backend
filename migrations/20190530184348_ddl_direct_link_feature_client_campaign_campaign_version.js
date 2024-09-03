export function up(knex) {
  var query = `
    ALTER TABLE reverb.client
        ADD COLUMN custom_identifier text,
        ADD CONSTRAINT custom_identifier_unique UNIQUE (custom_identifier),
        ADD CONSTRAINT custom_identifier_no_id_check CHECK (custom_identifier <> _id)
    ;

    ALTER TABLE reverb.campaign
        ADD COLUMN direct_share boolean not null default false,
        ADD COLUMN soreto_tag boolean not null default true
    ;

    CREATE TABLE reverb.campaign_version_fields(
        _id text NOT NULL DEFAULT reverb.generate_object_id(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        campaign_version_id text NOT NULL,
        data_type text NOT NULL,
        key text NOT NULL,
        value text,
        CONSTRAINT campaign_version_fields_id_pkey PRIMARY KEY (_id),
        CONSTRAINT campaign_version_id_fkey FOREIGN KEY (campaign_version_id)
                REFERENCES reverb.campaign_version(_id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION
    );

    select reverb.create_view_table_js('reverb.client');
    select reverb.create_view_table_js('reverb.campaign');
    select reverb.create_view_table_js('reverb.campaign_version_fields');
        `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP view IF EXISTS reverb.campaign_version_fields_js;
    DROP view IF EXISTS reverb.client_js;
    DROP view IF EXISTS reverb.campaign_js;
    DROP VIEW IF EXISTS reverb.agg_campaign_active_js;

    ALTER TABLE reverb.client
        DROP COLUMN custom_identifier
    ;

    ALTER TABLE reverb.campaign
        DROP COLUMN direct_share,
        DROP COLUMN soreto_tag
    ;

    DROP TABLE reverb.campaign_version_fields;

    select reverb.create_view_table_js('reverb.client');
    select reverb.create_view_table_js('reverb.campaign');
    `;
  return knex.schema.raw(query);
}