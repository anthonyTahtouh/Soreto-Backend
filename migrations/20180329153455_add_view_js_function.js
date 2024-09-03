exports.up = function(knex) {
  var query = `
  CREATE OR REPLACE FUNCTION reverb.create_view_table_js(schematblname text)
      RETURNS void
    AS $BODY$
    DECLARE
      tempT text;
    BEGIN
          select reverb.create_view_columns(schematblname) INTO tempT;
          EXECUTE concat('CREATE OR REPLACE VIEW ',schematblname,'_js AS SELECT ',tempT,' FROM ', schematblname);
    END;

$BODY$ LANGUAGE plpgsql;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};