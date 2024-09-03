export function up(knex) {
  var query = `
  ALTER TABLE reverb.assoc_campaigns_email_templates
   ADD COLUMN campaign_version_id text;
  ALTER TABLE reverb.assoc_campaigns_email_templates
   ADD CONSTRAINT fk_campaign_version FOREIGN KEY (campaign_version_id)
   REFERENCES reverb.campaign_version (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;

  CREATE OR REPLACE VIEW reverb.assoc_join_campaign_versions_email_templates_js AS
  SELECT assoc_campaigns_email_templates.campaign_version_id as "campaignVersionId",
    et._id,
    et.created_at as "createdAt",
    et.updated_at as "updatedAt",
    et.name,
    et.type,
    et.external_template_id as "externalTemplateId",
    et.template_values as "templateValues"
    FROM reverb.assoc_campaigns_email_templates
       JOIN reverb.email_template et ON et._id = assoc_campaigns_email_templates.email_tempate_id;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}