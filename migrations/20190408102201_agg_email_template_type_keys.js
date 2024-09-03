export function up(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_key_email_template_type_js AS
  SELECT key_email_template_type._id,
      key_email_template_type.created_at AS "createdAt",
      key_email_template_type.updated_at AS "updatedAt",
      key_email_template_type.email_template_type_id AS "emailTemplateTypeId",
	    email_template_type.value AS "emailTemplateType",
      key_email_template_type.input_type AS "inputType",
      key_email_template_type.label,
      key_email_template_type.default_value AS "defaultValue",
      key_email_template_type.required,
      key_email_template_type.template_key AS "templateKey",
      key_email_template_type.name
    FROM reverb.key_email_template_type
    Left join reverb.email_template_type as email_template_type
    ON email_template_type._id  =  key_email_template_type.email_template_type_id
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}