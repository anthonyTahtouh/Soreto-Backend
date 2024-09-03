
exports.up = function(knex) {

  const scriptSql = `
  CREATE TABLE reverb.var_definition
  (
      "_id"          TEXT DEFAULT reverb.generate_object_id() UNIQUE NOT NULL,
      setting_key    TEXT                                            NOT NULL,
      context        reverb.SETTING_CONTEXT                          NOT NULL,
      type           reverb.FIELD_TYPE                               NOT NULL,
      description    TEXT,
      fallback_value TEXT[],
      value_option   TEXT[],
      restrict       BOOL                                            NOT NULL,
      multi_value    BOOL                                            NOT NULL,
      client_id      TEXT REFERENCES reverb.client,
      PRIMARY KEY ("_id")
  );
  SELECT reverb.create_view_table_js('reverb.var_definition');

  CREATE TABLE reverb.global_vars
(
    "_id"                 TEXT  DEFAULT reverb.generate_object_id()       NOT NULL,
    object_id             TEXT                                            NOT NULL,
    var_definition_id     TEXT REFERENCES reverb.var_definition (_id) NOT NULL,
    value                 TEXT[] NOT NULL,
    UNIQUE (var_definition_id, object_id),
    PRIMARY KEY ("_id")
);

SELECT reverb.create_view_table_js('reverb.global_vars');

  
  `;
  return knex.schema.raw(scriptSql);
};

exports.down = function(knex) {
  const scriptSql = `
  
  DROP VIEW IF EXISTS reverb.agg_vars_js;
  DROP FUNCTION IF EXISTS reverb.func_get_var;
  DROP VIEW reverb.global_vars_js;
  DROP TABLE reverb.global_vars;
  DROP VIEW reverb.var_definition_js;
  DROP TABLE reverb.var_definition;
  `;
  return knex.schema.raw(scriptSql);
};
