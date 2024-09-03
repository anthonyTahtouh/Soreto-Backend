
exports.up = function(knex) {

  const scriptSql = `
          CREATE OR REPLACE FUNCTION reverb.check_var_definition_constraint(var_definition_id TEXT, _key TEXT,
              _context reverb.SETTING_CONTEXT, _restrict BOOL,
              _client_id TEXT) RETURNS BOOLEAN
          LANGUAGE plpgsql AS
          $func$
          BEGIN
  
          IF _restrict AND _client_id IS NULL THEN
          RAISE EXCEPTION 'client_id is required for restrict settings';
          END IF;
  
          IF EXISTS(SELECT _id
          FROM reverb.var_definition
          WHERE _id <> var_definition_id
          AND setting_key = _key
          AND context = _context
          AND (client_id IS NULL OR client_id = _client_id OR _client_id IS NULL)) THEN
          RAISE EXCEPTION 'setting [%] already exists for [%] context or for a specific client', _key, _context;
          END IF;
          RETURN TRUE;
          END
          $func$;

          ALTER TABLE reverb.var_definition
            ADD CONSTRAINT SETTING_CONSTRAINT CHECK (reverb.check_var_definition_constraint(_id, setting_key, context, restrict, client_id));
    `;
  return knex.schema.raw(scriptSql);
};

exports.down = function(knex) {
  const scriptSql = `DROP FUNCTION reverb.check_var_definition_constraint CASCADE;`;
  return knex.schema.raw(scriptSql);
};
