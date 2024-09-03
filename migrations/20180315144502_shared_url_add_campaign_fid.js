
exports.up = function(knex) {
  var query = `
  ALTER TABLE reverb.shared_url
  ADD COLUMN campaign_id text;


  ALTER TABLE reverb.shared_url
  ADD CONSTRAINT shared_url_campaign_id_fkey FOREIGN KEY (campaign_id)
      REFERENCES reverb."campaign" (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION;


  --DROP VIEW reverb.shared_url_js;

  CREATE OR REPLACE VIEW reverb.shared_url_js AS
  SELECT shared_url._id,
      shared_url.created_at AS "createdAt",
      shared_url.updated_at AS "updatedAt",
      shared_url.user_id AS "userId",
      shared_url.client_id AS "clientId",
      shared_url.product_url AS "productUrl",
      shared_url.short_url AS "shortUrl",
      shared_url.meta,
      shared_url.tracking_url AS "trackingUrl",
      shared_url.campaign_id AS "campaignId"
    FROM reverb.shared_url;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = ``;
  return knex.schema.raw(query);
  // var query = `
  // DROP VIEW reverb.shared_url_js;

  // CREATE OR REPLACE VIEW reverb.shared_url_js AS
  //  SELECT shared_url._id,
  //     shared_url.created_at AS "createdAt",
  //     shared_url.updated_at AS "updatedAt",
  //     shared_url.user_id AS "userId",
  //     shared_url.client_id AS "clientId",
  //     shared_url.product_url AS "productUrl",
  //     shared_url.short_url AS "shortUrl",
  //     shared_url.meta,
  //     shared_url.tracking_url AS "trackingUrl"
  //    FROM reverb.shared_url;

  // ALTER TABLE reverb.shared_url
  // DROP CONSTRAINT shared_url_campaign_id_fkey;

  // ALTER TABLE reverb.shared_url
  // DROP COLUMN campaign_id;


  // `;
  // return knex.schema.raw(query);
};
