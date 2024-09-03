exports.up = function(knex) {
  let query = `
      ALTER TABLE reverb.mp_banner ADD COLUMN cover_image_tablet_url TEXT;
      ALTER TABLE reverb.mp_banner ADD COLUMN cover_image_mobile_url TEXT;
  
      select reverb.create_view_table_js('reverb.mp_banner');
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW reverb.mp_banner_js;
    
      ALTER TABLE reverb.mp_banner DROP COLUMN cover_image_tablet_url;
      ALTER TABLE reverb.mp_banner DROP COLUMN cover_image_mobile_url;
    
      select reverb.create_view_table_js('reverb.mp_banner');
      `;
  return knex.schema.raw(query);
};
