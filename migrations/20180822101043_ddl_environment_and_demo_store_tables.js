exports.up = function(knex) {
  var query = `
      CREATE TABLE reverb.environment
      (
          _id text NOT NULL DEFAULT reverb.generate_object_id(),
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          name text NOT NULL,
          CONSTRAINT environment_pkey PRIMARY KEY (_id),
          CONSTRAINT environment_name_unique UNIQUE (name)
      );

      insert INTO reverb.environment(name) values ('Staging');
      insert INTO reverb.environment(name) values ('Sandbox');
      insert INTO reverb.environment(name) values ('Production');

      CREATE TABLE reverb.demo_store
      (
          _id text NOT NULL DEFAULT reverb.generate_object_id(),
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          client_id text NOT NULL,
          client_name text NOT NULL,
          store_name text NOT NULL,
          store_link text NOT NULL,
          environment text NOT NULL,
          notes text NOT NULL,
          CONSTRAINT demo_store_pkey PRIMARY KEY (_id),
          CONSTRAINT client_id_fkey FOREIGN KEY (client_id)
              REFERENCES reverb.client (_id) MATCH SIMPLE
              ON UPDATE NO ACTION ON DELETE NO ACTION
      );

      select reverb.create_view_table_js('reverb.environment');
      select reverb.create_view_table_js('reverb.demo_store');
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      drop view reverb.environment'_js;
      drop table reverb.environment';

      drop view reverb.demo_store_js;
      drop table reverb.demo_store;
      `;
  return knex.schema.raw(query);
};