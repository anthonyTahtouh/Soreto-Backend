
exports.seed = function(knex) {
  return knex.raw(`
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
      client.updated_at AS "updatedAt",
      client.active,
      client.template,
      client.custom_identifier as "customIdentifier",
      country.country_name AS "countryName"
    FROM reverb.client
          LEFT JOIN reverb.country country ON client.country_id = country._id
  `);
};