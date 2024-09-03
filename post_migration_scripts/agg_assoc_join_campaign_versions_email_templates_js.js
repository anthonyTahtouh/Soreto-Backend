
exports.seed = function(knex) {
  return knex.raw(`

    DROP VIEW IF EXISTS reverb.agg_assoc_join_campaign_versions_email_templates_js;
    
    CREATE OR REPLACE VIEW reverb.agg_assoc_join_campaign_versions_email_templates_js AS
    SELECT assoc_campaigns_email_templates._id,
        assoc_campaigns_email_templates.created_at AS "createdAt",
        assoc_campaigns_email_templates.updated_at AS "updatedAt",
        client.name AS client,
        client._id AS "clientId",
        campaign.description AS "campaignName",
        campaign._id AS "campaignId",
        campaign_version.name AS "campaignVersionName",
        campaign_version._id AS "campaignVersionId",
        assoc_campaigns_email_templates.email_template_id AS "emailTemplateId",
        email_template.name AS "emailTemplate",
        email_template.external_service_name AS "externalServiceName",
        email_template.type AS "emailTemplateType",
        assoc_campaigns_email_templates.archived
      FROM reverb.assoc_campaigns_email_templates assoc_campaigns_email_templates
        JOIN reverb.campaign campaign ON campaign._id = assoc_campaigns_email_templates.campaign_id
        JOIN reverb.client client ON client._id = campaign.client_id
        JOIN reverb.campaign_version campaign_version ON campaign_version._id = assoc_campaigns_email_templates.campaign_version_id
        JOIN reverb.email_template email_template ON assoc_campaigns_email_templates.email_template_id = email_template._id;

    `);
};