export function up(knex) {
  var query = `
    ALTER TABLE reverb.email_template add column external_service_name text;

    SELECT reverb.create_view_table_js('reverb.email_template');

    UPDATE reverb.email_template set external_service_name = 'SENDINBLUE';

    DROP VIEW reverb.agg_assoc_join_campaign_versions_email_templates_js;

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
            email_template.external_service_name AS "externalServiceName"
        FROM reverb.assoc_campaigns_email_templates assoc_campaigns_email_templates
            JOIN reverb.campaign campaign ON campaign._id = assoc_campaigns_email_templates.campaign_id
            JOIN reverb.client client ON client._id = campaign.client_id
            JOIN reverb.campaign_version campaign_version ON campaign_version._id = assoc_campaigns_email_templates.campaign_version_id
            JOIN reverb.email_template email_template ON assoc_campaigns_email_templates.email_template_id = email_template._id;

      DROP VIEW reverb.assoc_join_campaign_versions_email_templates_js;

      CREATE OR REPLACE VIEW reverb.assoc_join_campaign_versions_email_templates_js AS
        SELECT
          assoc_campaigns_email_templates.campaign_version_id AS "campaignVersionId",
        assoc_campaigns_email_templates.campaign_id AS "campaignId",
          et._id,
          et.created_at AS "createdAt",
          et.updated_at AS "updatedAt",
          et.name,
          et.type,
          et.external_template_id AS "externalTemplateId",
          et.template_values AS "templateValues",
          et.external_service_name AS "externalServiceName"
          FROM reverb.assoc_campaigns_email_templates
            JOIN reverb.email_template et ON et._id = assoc_campaigns_email_templates.email_template_id;

      DROP VIEW reverb.assoc_join_campaigns_email_templates_js;;

  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}