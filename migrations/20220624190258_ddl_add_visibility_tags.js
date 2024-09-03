
exports.up = function(knex) {
  var query = `
    ALTER TABLE reverb.mp_banner ADD COLUMN visibility_tags jsonb;

    select reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW reverb.mp_banner_js;
  
    ALTER TABLE reverb.mp_banner DROP COLUMN visibility_tags;
  
    select reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};
