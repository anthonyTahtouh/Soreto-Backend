exports.up = function(knex) {
  var query = `
          CREATE TABLE
          reverb.ab_test
          (
              _id text UNIQUE NOT NULL DEFAULT reverb.generate_object_id(),
              created_at timestamp with time zone NOT NULL DEFAULT now(),
              updated_at timestamp with time zone NOT NULL DEFAULT now(),
              name text NOT NULL,
              description text,
              "type" text NOT NULL,
              start_date timestamp with time zone NOT NULL,
              end_date timestamp with time zone,
              responsible_user_id text NOT NULL,
              kpis text[],
              PRIMARY KEY ("_id"),
              FOREIGN KEY (responsible_user_id) REFERENCES reverb.user(_id)
          );
  
          select reverb.create_view_table_js('reverb.ab_test');
        `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
        drop view if exists reverb.ab_test_js;
        drop table reverb.ab_test;
        `;
  return knex.schema.raw(query);
};
