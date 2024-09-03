exports.seed = function(knex) {
  return knex.raw(`
        
        DROP VIEW IF EXISTS reverb.agg_single_shared_js;
      
        CREATE OR REPLACE VIEW reverb.agg_single_shared_js AS
        SELECT 
            su._id AS "sharedUrlId",
            su.created_at AS "suCreatedAt",
            su.short_url AS "shortUrl",
            su.social_platform AS "socialPlatform",
            su.client_id  AS "clientId",
            su.meta AS "suMeta",
            cpv._id AS "campaignVersionId",
            cpv.link_expiry_days AS "campaignVersionLinkExpiryDays",
            cpv.public_shared_url_expires_at AS "campaignVersionPublicSharedUrlExpiresAt",
            u._id AS "userId",
            u.email AS "userEmail"
        FROM
            reverb.shared_url su
            LEFT JOIN
            reverb.campaign_version cpv ON su.campaign_version_id = cpv._id
            LEFT JOIN
            reverb.USER u ON su.user_id = u._id
        WHERE
            su.type = 'SHARED'
        order by 
            su.created_at desc 
        `);
};