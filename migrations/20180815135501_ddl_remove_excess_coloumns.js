export function up(knex) {
  var query = `
  DROP VIEW reverb.agg_campaign_js;

  CREATE OR REPLACE VIEW reverb.agg_campaign_js AS
  SELECT campaign._id,
      campaign.created_at AS "createdAt",
      campaign.updated_at AS "updatedAt",
      campaign.client_id AS "clientId",
      client.name AS "clientName",
      campaign.expiry,
      campaign.description
    FROM reverb.campaign campaign
      JOIN reverb.client client ON campaign.client_id = client._id;




  DROP VIEW reverb.agg_campaign_version_js;

  CREATE OR REPLACE VIEW reverb.agg_campaign_version_js AS
  SELECT campaignversion._id,
      campaignversion.created_at AS "createdAt",
      campaignversion.updated_at AS "updatedAt",
      campaignversion.active,
      campaignversion.name,
      campaign.description AS "campaignName",
      client.name AS "clientName",
      campaignversion.exposure,
      ( SELECT code_block.preview_desktop_thumbnail_url
            FROM reverb.code_block
            WHERE code_block.display_block_id = (( SELECT displayblock._id
                    FROM reverb.display_block displayblock
                    WHERE displayblock.campaign_version_id = campaignversion._id AND displayblock.active = true)) AND code_block.active = true
            ORDER BY code_block.updated_at DESC
          LIMIT 1) AS "previewDesktopThumbnailUrl"
    FROM reverb.campaign_version campaignversion
      JOIN reverb.campaign campaign ON campaignversion.campaign_id = campaign._id
      JOIN reverb.client client ON campaign.client_id = client._id;

      


  DROP VIEW reverb.campaign_js;

  ALTER TABLE reverb.campaign 
  DROP COLUMN "type",
  DROP COLUMN sub_type,
  DROP COLUMN value_type,
  DROP COLUMN value_amount;

  select reverb.create_view_table_js('reverb.campaign');


  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}