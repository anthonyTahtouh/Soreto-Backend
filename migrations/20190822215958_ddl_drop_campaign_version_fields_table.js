
exports.up = function up(knex) {

  const query  = `
  DROP view IF EXISTS reverb.campaign_version_fields_js;
  DROP TABLE reverb.campaign_version_fields;`;
  return knex.schema.raw(query);
};

exports.down = function (knex) {

  const query =
    `CREATE TABLE reverb.campaign_version_fields(
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
  
  select reverb.create_view_table_js('reverb.campaign_version_fields');
  `;
  return knex.schema.raw(query);
};

exports.config = { transaction: false };