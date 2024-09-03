export function up(knex) {
  var query = `
        ALTER TABLE reverb.campaign
        RENAME copied_from_campaign_id TO source_campaign_id;
      
        DROP VIEW reverb.campaign_js;

        select reverb.create_view_table_js('reverb.campaign');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
    ALTER TABLE reverb.campaign
    RENAME source_campaign_id TO copied_from_campaign_id;

    DROP VIEW reverb.campaign_js;

    select reverb.create_view_table_js('reverb.campaign');`;

  return knex.schema.raw(query);
}