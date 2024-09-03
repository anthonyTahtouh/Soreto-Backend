
export function up(knex) {
  var query = ` 
    ALTER TABLE reverb.assoc_campaigns_email_templates
    RENAME COLUMN email_tempate_id to email_template_id
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      
    `;
  return knex.schema.raw(query);
}
