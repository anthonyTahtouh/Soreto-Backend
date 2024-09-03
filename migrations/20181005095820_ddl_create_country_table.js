exports.up = function(knex) {
  var query = `
      CREATE TABLE reverb.country
      (
          _id text NOT NULL DEFAULT reverb.generate_object_id(),
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now(),
          name text NOT NULL,
          code text NOT NULL,
          currency text NOT NULL,
          currency_sign text NOT NULL,
          CONSTRAINT country_pkey PRIMARY KEY (_id),
          CONSTRAINT country_name_unique UNIQUE (name),
          CONSTRAINT country_code_unique UNIQUE (code)
      );

      select reverb.create_view_table_js('reverb.country');
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      drop view reverb.country'_js;
      drop table reverb.country';
      `;
  return knex.schema.raw(query);
};