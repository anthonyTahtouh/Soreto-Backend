export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_client_js AS
      SELECT client._id,
        client.name,
        client.referer,
        client.percent_commission ->> 'default'::text AS "percentCommission",
        client.primary_contact_first_name AS "primaryContactFirstName",
        client.primary_contact_last_name AS "primaryContactLastName",
        client.primary_contact_phone AS "primaryContactPhone",
        client.primary_contact_email AS "primaryContactEmail",
        client.created_at AS "createdAt",
        client.updated_at AS "updatedAt"
      FROM reverb.client;
 `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `DROP VIEW reverb.agg_client_js`;
  return knex.schema.raw(query);
}