exports.up = function(knex) {
  var query = `
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
          WHERE code_block.display_block_id =
      (SELECT displayBlock._id
                  FROM reverb.display_block displayBlock
                  WHERE displayBlock.campaign_version_id = campaignversion._id)
      AND code_block.active = true
      ORDER BY code_block.updated_at desc
      LIMIT 1)
    AS "previewDesktopThumbnailUrl"
    FROM reverb.campaign_version campaignversion
      JOIN reverb.campaign campaign ON campaignversion.campaign_id = campaign._id
      JOIN reverb.client client ON campaign.client_id = client._id
      `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
            DROP VIEW reverb.agg_campaign_version_js;
              `;
  return knex.schema.raw(query);
};
