
export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.assoc_campaigns_email_templates_js AS 

      SELECT
          assoc_campaigns_email_templates._id,
          assoc_campaigns_email_templates.created_at as "createdAt",
          assoc_campaigns_email_templates.updated_at as "updatedAt", 
          assoc_campaigns_email_templates.campaign_id as "campaignId", 
          assoc_campaigns_email_templates.campaign_version_id as "campaignVersionId",
          assoc_campaigns_email_templates.email_template_id as "emailTemplateId"          
      FROM
          reverb.assoc_campaigns_email_templates          
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.assoc_campaigns_email_templates_js;
    `;
  return knex.schema.raw(query);
}
