
exports.up = function(knex) {
  let query = `
    ALTER TABLE reverb.mp_banner ADD COLUMN custom_url_target TEXT;

    select reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW reverb.mp_banner_js;
  
    ALTER TABLE reverb.mp_banner DROP COLUMN custom_url_target;
  
    select reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};
