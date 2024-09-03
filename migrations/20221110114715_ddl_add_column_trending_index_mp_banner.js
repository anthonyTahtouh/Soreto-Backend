
exports.up = function(knex) {
  var query = `  
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW reverb.mp_banner_js;

      ALTER TABLE reverb.mp_banner ADD COLUMN trending_index integer NOT NULL DEFAULT 1;
      ALTER TABLE reverb.mp_banner ADD COLUMN trending_index_increment serial not null;
      UPDATE reverb.mp_banner SET trending_index = trending_index_increment;
      ALTER TABLE reverb.mp_banner DROP COLUMN trending_index_increment;

      ALTER TABLE reverb.mp_banner ADD CONSTRAINT trending_index_unique UNIQUE (trending_index);
  
      SELECT reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW reverb.mp_banner_js;
  
      ALTER TABLE reverb.mp_banner DROP COLUMN trending_index;
    
      SELECT reverb.create_view_table_js('reverb.mp_banner');
  `;
  return knex.schema.raw(query);
};
