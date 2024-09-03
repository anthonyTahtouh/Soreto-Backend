
exports.up = function (knex) {
  var query = `
    INSERT INTO reverb.var_definition
        (
        setting_key, context, "type", 
        description, 
        fallback_value, value_option, "restrict", multi_value, client_id
        )
        VALUES(
            'INTERSTITIAL_CLICK_DEDUPLICATION', 'CLIENT.TRACKING'::reverb.setting_context, 'BOOLEAN'::reverb.field_type, 
            'Clients with this configuration activated will track duplicated interstitial_loaded and interstital_cta tracking events as insterstitial_loaded_dup and interstitial_cta_dub', 
            '{false}', '{true,false}', false, false, NULL
        );
       `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  return knex.schema.raw(`
  
    delete from reverb.var_definition 
    where 
      setting_key = 'INTERSTITIAL_CLICK_DEDUPLICATION' and 
      context = 'CLIENT.TRACKING';
  
  `
  );
};
