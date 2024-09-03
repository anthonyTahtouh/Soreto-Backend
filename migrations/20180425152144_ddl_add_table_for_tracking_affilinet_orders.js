exports.up = function(knex) {
  var query = `
  CREATE TABLE reverb.affilinet_order
  (
      _id text NOT NULL DEFAULT reverb.generate_object_id(),
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      content jsonb DEFAULT '{}'::jsonb,
      CONSTRAINT affilinet_order_pkey PRIMARY KEY (_id)
  );

  select reverb.create_view_table_js('reverb.affilinet_order');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};