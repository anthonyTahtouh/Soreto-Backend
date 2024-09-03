export function up(knex) {
  var query = `
        ALTER TABLE reverb.campaign
        ADD COLUMN active boolean DEFAULT false;
  
        UPDATE reverb.campaign SET active = true;
        
        select reverb.create_view_table_js('reverb.campaign');
  
        `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        DROP VIEW reverb.campaign_js;
  
        ALTER TABLE reverb.campaign
        DROP COLUMN IF EXISTS active;
  
        select reverb.create_view_table_js('reverb.campaign');
      `;
  return knex.schema.raw(query);
}