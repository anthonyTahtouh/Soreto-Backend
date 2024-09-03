export function up(knex) {
  var query = `
    ALTER TABLE reverb.demo_store
    ADD COLUMN campaign_id TEXT,
    ADD COLUMN campaign_name TEXT,
    ADD COLUMN campaign_version_id TEXT,
    ADD COLUMN campaign_version_name TEXT,
    ADD CONSTRAINT fk_demo_store_campaign_id FOREIGN KEY (campaign_id)
        REFERENCES reverb.campaign (_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION,
    ADD CONSTRAINT fk_demo_store_campaign_version_id FOREIGN KEY (campaign_version_id)
        REFERENCES reverb.campaign_version (_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

    SELECT reverb.create_view_table_js('reverb.demo_store');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.demo_store_js;

    ALTER TABLE reverb.demo_store
        DROP COLUMN IF EXISTS campaign_id,
        DROP COLUMN IF EXISTS campaign_name,
        DROP COLUMN IF EXISTS campaign_version_id,
        DROP COLUMN IF EXISTS campaign_version_name;

    SELECT reverb.create_view_table_js('reverb.demo_store');
`;
  return knex.schema.raw(query);
}