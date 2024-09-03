
exports.seed = function(knex) {
  return knex.raw(`
CREATE OR REPLACE FUNCTION reverb.func_get_var(_key TEXT, _context reverb.SETTING_CONTEXT, _object_id TEXT DEFAULT NULL,
                                               _client_id TEXT DEFAULT NULL)
    RETURNS SETOF TEXT AS
$func$
DECLARE
    ret TEXT[];
BEGIN

    IF _client_id IS NOT NULL THEN
        ret = (SELECT gs.value
               FROM reverb.global_vars gs
                        LEFT JOIN reverb.var_definition sd ON gs.var_definition_id = sd._id
               WHERE sd.setting_key = _key
                 AND gs.object_id = _object_id
                 AND sd.context = _context
                 AND sd.client_id = _client_id
        );

        IF ret IS NULL THEN
            ret = (SELECT sd.fallback_value
                   FROM reverb.var_definition sd
                   WHERE sd.setting_key = _key
                     AND sd.context = _context
                     AND sd.client_id = _client_id);
        END IF;

    ELSE
        ret = (SELECT gs.value
               FROM reverb.global_vars gs
                        LEFT JOIN reverb.var_definition sd ON gs.var_definition_id = sd._id
               WHERE sd.setting_key = _key
                 AND gs.object_id = _object_id
                 AND sd.context = _context);

        IF ret IS NULL THEN
            ret = (SELECT sd.fallback_value
                   FROM reverb.var_definition sd
                   WHERE sd.setting_key = _key
                     AND sd.context = _context
                     AND sd.client_id IS NULL);
        END IF;
    END IF;
    RETURN QUERY SELECT * FROM unnest(ret);
END
      $func$ LANGUAGE plpgsql;
      
      `);
};