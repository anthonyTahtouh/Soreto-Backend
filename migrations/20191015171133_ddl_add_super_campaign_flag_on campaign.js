export function up(knex) {
  var query = `
  
          ALTER TABLE reverb.campaign
            ADD COLUMN super_campaign BOOLEAN NOT NULL DEFAULT false;
  
          SELECT reverb.create_view_table_js('reverb.campaign');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
          DROP VIEW reverb.campaign_js;
    
          ALTER TABLE reverb.campaign
              DROP COLUMN IF EXISTS super_campaign;
      
          SELECT reverb.create_view_table_js('reverb.campaign');          
      `;
  return knex.schema.raw(query);
}