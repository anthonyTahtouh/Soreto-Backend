export function up(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_campaign_js AS
  SELECT campaign._id,
     campaign.created_at AS "createdAt",
     campaign.updated_at AS "updatedAt",
     campaign.client_id AS "clientId",
     client.name AS "clientName",
     campaign.expiry,
     campaign.description,
     campaign.start_date AS "startDate"
    FROM reverb.campaign campaign
      JOIN reverb.client client ON campaign.client_id = client._id;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `

  `;
  return knex.schema.raw(query);
}