
exports.up = function(knex) {
  var query = `  
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW reverb.mp_banner_js;

      ALTER TABLE reverb.mp_banner ALTER COLUMN trending_index DROP NOT NULL;
      ALTER TABLE reverb.mp_banner DROP CONSTRAINT trending_index_unique;

      SELECT reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW reverb.mp_banner_js;
  
      ALTER TABLE reverb.mp_banner ALTER COLUMN trending_index SET NOT NULL;
      ALTER TABLE reverb.mp_banner ADD CONSTRAINT trending_index_unique UNIQUE (trending_index);
      
      SELECT reverb.create_view_table_js('reverb.mp_banner');
  `;
  return knex.schema.raw(query);
};
