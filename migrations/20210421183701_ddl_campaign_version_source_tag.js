export function up(knex) {

  var query = `
    ALTER TABLE reverb.campaign_version ADD COLUMN source_tags TEXT[];

    select reverb.create_view_table_js('reverb.campaign_version');
   `;
  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
    DROP VIEW reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version DROP COLUMN source_tags;

    select reverb.create_view_table_js('reverb.campaign_version');
    `;

  return knex.schema.raw(query);
}