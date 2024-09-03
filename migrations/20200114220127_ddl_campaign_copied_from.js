export function up(knex) {
  var query = `
      ALTER TABLE reverb.campaign
      ADD COLUMN copied_from_campaign_id text;
    
      select reverb.create_view_table_js('reverb.campaign');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.campaign_js;
  
      ALTER TABLE reverb.campaign
      DROP COLUMN copied_from_campaign_id;
  
      select reverb.create_view_table_js('reverb.campaign');`;
  return knex.schema.raw(query);
}