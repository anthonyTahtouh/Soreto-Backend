
exports.seed = function(knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_vars_js;
  CREATE OR REPLACE VIEW reverb.agg_vars_js
  AS
          
  SELECT 
      vd.setting_key                       AS "settingKey",
        vd.description                            AS descripttion,
        gv.value                                  AS value,
        vd.fallback_value                         AS "fallbackValue",
        vd.context,
        vd.type,
        vd.value_option                           AS "valueOption",
        vd.restrict,
        vd.multi_value                            AS "multiValue",
        gv.object_id                              AS "objectId",
        vd.client_id                              AS "clientId",
        gv._id                                    AS "globalVarSettingId",
        vd._id                                    AS "varDefinitionId",
        (vd.client_id IS NULL AND object_id IS NULL) AS "fallbacked"
  FROM 
        reverb.var_definition vd
        LEFT OUTER 
        JOIN 
          reverb.global_vars gv 
          ON 
      gv.var_definition_id = vd._id
      
  UNION ALL 
          
  SELECT 
      vd2.setting_key                       AS "settingKey",
      vd2.description                            AS descripttion,
      null                                  AS value,
      vd2.fallback_value                         AS "fallbackValue",
      vd2.context,
      vd2.type,
      vd2.value_option                           AS "valueOption",
      vd2.restrict,
      vd2.multi_value                            AS "multiValue",
      null                              AS "objectId",
      null                              AS "clientId",
      null                                    AS "globalVarSettingId",
      vd2._id                                    AS "varDefinitionId",
      true as "fallbacked"
              
  FROM 
        reverb.var_definition vd2
          
  WHERE 
      vd2.client_id is null

  ORDER BY "settingKey", "objectId" DESC;
  `);
};
