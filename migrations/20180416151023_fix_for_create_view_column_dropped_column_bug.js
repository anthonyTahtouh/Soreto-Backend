exports.up = function(knex) {
  var query = `
    CREATE OR REPLACE FUNCTION reverb.create_view_columns(schematblname text)
    RETURNS text AS
    $BODY$
    SELECT string_agg
    ( concat(a.attname,' AS ',
          case when left(a.attname,1)='_'
          then quote_ident(concat('_',lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
          else quote_ident(concat(lower(left(replace(initcap(replace(a.attname,'_',' ')),' ',''),1)),right(replace(initcap(replace(a.attname,'_',' ')),' ',''),length(replace(initcap(replace(a.attname,'_',' ')),' ',''))-1)))
      end ), ',')
          AS field
        FROM pg_attribute a, pg_class c, pg_namespace n
        WHERE
            a.attnum > 0
            AND a.attrelid = c.oid
            AND n.oid = c.relnamespace
            AND c.relname = quote_ident(split_part(schematblName, '.', 2))
            AND n.nspname = quote_ident(split_part(schematblName, '.', 1))
            AND a.attisdropped = false;
    $BODY$
      LANGUAGE sql VOLATILE
      COST 100;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};
