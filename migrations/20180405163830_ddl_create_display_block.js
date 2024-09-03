exports.up = function(knex) {
  var query = `
    CREATE TABLE reverb.display_block
    (
        _id text NOT NULL DEFAULT reverb.generate_object_id(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        active boolean NOT NULL DEFAULT true,
        campaign_id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        CONSTRAINT display_block_pkey PRIMARY KEY (_id),
        CONSTRAINT campaign_id_fkey FOREIGN KEY (campaign_id)
            REFERENCES reverb.campaign (_id) MATCH SIMPLE
            ON UPDATE NO ACTION ON DELETE NO ACTION
    );

    select reverb.create_view_table_js('reverb.display_block');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    drop view reverb.display_block_js;
    drop table reverb.display_block;
    `;
  return knex.schema.raw(query);
};