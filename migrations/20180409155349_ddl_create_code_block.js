exports.up = function(knex) {
  var query = `
      CREATE TABLE reverb.code_block
      (
          _id text NOT NULL DEFAULT reverb.generate_object_id(),
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          active boolean NOT NULL DEFAULT true,
          display_block_id text NOT NULL,
          name text NOT NULL,
          html text NOT NULL,
          CONSTRAINT code_block_pkey PRIMARY KEY (_id),
          CONSTRAINT display_block_id_fkey FOREIGN KEY (display_block_id)
              REFERENCES reverb.display_block (_id) MATCH SIMPLE
              ON UPDATE NO ACTION ON DELETE NO ACTION
      );

      select reverb.create_view_table_js('reverb.code_block');
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      drop view reverb.code_block_js;
      drop table reverb.code_block;
      `;
  return knex.schema.raw(query);
};