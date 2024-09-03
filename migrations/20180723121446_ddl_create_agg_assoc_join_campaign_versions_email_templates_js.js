
export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_assoc_join_campaign_versions_email_templates_js AS 
      
      SELECT 
        assoc_campaigns_email_templates._id,
        assoc_campaigns_email_templates.created_at AS "createdAt",
        assoc_campaigns_email_templates.updated_at AS "updatedAt",
        client.name AS client,
        client._id AS "clientId",
        campaign.description AS "campaignName",
        campaign._id AS "campaignId",
        campaign_version.name AS "campaignVersionName",
        campaign_version._id AS "campaignVersionId",
        assoc_campaigns_email_templates.email_template_id AS "emailTemplateId",
        email_template.name AS "emailTemplate"
    FROM 
        reverb.assoc_campaigns_email_templates assoc_campaigns_email_templates
        JOIN reverb.campaign campaign ON campaign._id = assoc_campaigns_email_templates.campaign_id
        JOIN reverb.client client ON client._id = campaign.client_id
        JOIN reverb.campaign_version campaign_version ON campaign_version._id = assoc_campaigns_email_templates.campaign_version_id
        JOIN reverb.email_template email_template ON assoc_campaigns_email_templates.email_template_id = email_template._id;
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.agg_assoc_join_campaign_versions_email_templates_js;
    `;
  return knex.schema.raw(query);
}
