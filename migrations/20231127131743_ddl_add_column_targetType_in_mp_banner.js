export function up(knex) {
  var query = `   
              DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
              DROP VIEW IF EXISTS reverb.mp_banner_js;
          
              ALTER TABLE reverb.mp_banner ADD COLUMN target_type_id TEXT NULL DEFAULT NULL;
          
              SELECT reverb.create_view_table_js('reverb.mp_banner');
              `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `    
            DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
            DROP VIEW IF EXISTS reverb.mp_banner_js;
          
            ALTER TABLE reverb.mp_banner DROP COLUMN target_type_id;
                
            SELECT reverb.create_view_table_js('reverb.mp_banner');
            `;
  return knex.schema.raw(query);
}