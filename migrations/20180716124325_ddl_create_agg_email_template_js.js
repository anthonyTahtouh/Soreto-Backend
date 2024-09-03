
export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_email_template_js AS 
      select
          email_template._id,
          email_template.created_at as "createdAt",
          email_template.updated_at as "updatedAt",  
          email_template.name as "name",
          email_template.type as "type", 
          email_template.external_template_id as "externalTemplateId",
          email_template.template_values as "templateValues",        
          email_template.client_id as "clientId",           
          client.name as "clientName"
      from
          reverb.email_template email_template            
          join reverb.client client
          on email_template.client_id = client._id;
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.agg_email_template_js;
    `;
  return knex.schema.raw(query);
}
