export function up(knex) {
  var query = `
    ALTER TABLE reverb.tracking_event_history
    ADD COLUMN campaign_version_id text;
  
    ALTER TABLE reverb.tracking_event_history
    ADD CONSTRAINT tracking_event_history_campaign_version_id_fkey FOREIGN KEY (campaign_version_id)
      REFERENCES reverb."campaign_version" (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;
  
    select reverb.create_view_table_js('reverb.tracking_event_history');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.tracking_event_history_js;

    ALTER TABLE reverb.tracking_event_history
    DROP CONSTRAINT tracking_event_history_campaign_version_id_fkey;

    ALTER TABLE reverb.tracking_event_history
    DROP COLUMN campaign_version_id;

    select reverb.create_view_table_js('reverb.tracking_event_history');
  `;
  return knex.schema.raw(query);
}