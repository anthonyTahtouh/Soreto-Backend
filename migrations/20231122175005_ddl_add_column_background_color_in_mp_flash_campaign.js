export function up(knex) {
  var query = `   
            DROP VIEW IF EXISTS reverb.mp_flash_campaign_js; 
        
            ALTER TABLE reverb.mp_flash_campaign ADD COLUMN background_color TEXT NULL DEFAULT NULL;
        
            SELECT reverb.create_view_table_js('reverb.mp_flash_campaign');
            `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `    
          DROP view if exists reverb.mp_flash_campaign_js;
        
          ALTER TABLE reverb.mp_flash_campaign DROP COLUMN background_color;
              
          SELECT reverb.create_view_table_js('reverb.mp_flash_campaign');
          `;
  return knex.schema.raw(query);
}