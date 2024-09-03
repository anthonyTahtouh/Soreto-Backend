export function up(knex) {
  var query = `
  ALTER TABLE reverb.campaign
  ADD COLUMN start_date timestamp with time zone NOT NULL DEFAULT now();

  select reverb.create_view_table_js('reverb.campaign');

  UPDATE reverb.campaign set start_date = "created_at";
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.campaign_js;

      ALTER TABLE reverb.campaign
      DROP COLUMN IF EXISTS start_date;
      
      select reverb.create_view_table_js('reverb.campaign');
  `;
  return knex.schema.raw(query);
}