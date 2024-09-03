
exports.seed = function(knex) {
  return knex.raw(`
      CREATE OR REPLACE VIEW reverb.agg_order_external_order_user AS
        SELECT 
            CASE 
            WHEN ord."_id"  is not null  THEN 'internal'
            WHEN exord."_id" is not null  THEN 'external'
            END AS "source",
            COALESCE(ord._id, exord._id) as "_id",
            ord.created_at as "createdAt",
            exord.transacted_at as "transactedAt",
            CASE 
            WHEN ord."_id"  is not null  THEN ord.status
            WHEN exord."_id" is not null  THEN exord.status
            END as "status",
            su.user_id as "userId",
            COALESCE(ord.shared_url_access_id, exord.shared_url_access_id) as "sharedUrlAccessId",
            COALESCE(ord.client_id, exord.client_id) as "clientId"
        FROM
            reverb.shared_url su
            INNER JOIN
            reverb.shared_url_access sua on sua.shared_url_id = su._id
            LEFT JOIN 
            reverb.order ord on ord.shared_url_access_id = sua._id
            LEFT JOIN
            reverb.external_order exord on exord.shared_url_access_id = sua._id
        WHERE 
            su."type" = 'SHARED'
            AND
            ord.shared_url_access_id  is not null
            OR
            exord.shared_url_access_id is not null
    `);
};