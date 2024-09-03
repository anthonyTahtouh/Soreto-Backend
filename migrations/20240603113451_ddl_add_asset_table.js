
exports.up = function(knex) {
  let query = `
    CREATE TABLE reverb.asset (
        "_id" text NOT NULL DEFAULT reverb.generate_object_id(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        campaign_version_id text NOT NULL,
        "type" text NULL,
        compiled text NULL,
        active bool NOT NULL DEFAULT false,
        extra_style jsonb NULL,
        "data" json NULL,
        template_name varchar NOT NULL,
        template_version varchar NOT NULL,
        CONSTRAINT asset_campaign_version_id_type_active_key UNIQUE (campaign_version_id, type, active),
        CONSTRAINT asset_pkey PRIMARY KEY (_id),
        CONSTRAINT asset_campaign_version_id_fkey FOREIGN KEY (campaign_version_id) REFERENCES reverb.campaign_version("_id")
    );

    select reverb.create_view_table_js('reverb.asset');
`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  let query = `
      DROP VIEW IF EXISTS reverb.asset_js;
  
      DROP TABLE reverb.asset;

`;
  return knex.schema.raw(query);
};
