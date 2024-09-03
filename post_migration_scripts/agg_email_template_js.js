
exports.seed = function(knex) {
  return knex.raw(`
  CREATE OR REPLACE VIEW reverb.agg_email_template_js AS
  SELECT email_template._id,
      email_template.created_at AS "createdAt",
      email_template.updated_at AS "updatedAt",
      email_template.name,
      email_template.type,
      email_template.external_template_id AS "externalTemplateId",
      email_template.template_values AS "templateValues",
      email_template.email_template_type_id AS "emailTemplateTypeId",
      email_template.client_id AS "clientId",
      client.name AS "clientName",
      email_template.external_service_name AS "externalServiceName",
      email_template.archived
    FROM reverb.email_template email_template
      JOIN reverb.client client ON email_template.client_id = client._id;        
          `);
};