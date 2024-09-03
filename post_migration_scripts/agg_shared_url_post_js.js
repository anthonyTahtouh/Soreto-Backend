let sql = `

    CREATE OR REPLACE VIEW reverb.agg_shared_url_post_js AS
    SELECT shared_url._id,
    shared_url.created_at AS "createdAt",
    shared_url.updated_at AS "updatedAt",
    shared_url.user_id AS "userId",
    shared_url.client_id AS "clientId",
    shared_url.product_url AS "productUrl",
    shared_url.short_url AS "shortUrl",
    post.posts
    FROM reverb.shared_url shared_url
        JOIN ( SELECT shared_url_1._id,
            jsonb_agg(( SELECT row_to_json(social_post.*) AS row_to_json)) AS posts
            FROM reverb.shared_url_js shared_url_1
                JOIN reverb.social_post_js social_post ON shared_url_1._id = social_post."sharedUrlId"
            GROUP BY shared_url_1._id) post ON shared_url._id = post._id;
`;

exports.seed = function(knex) {
  return knex.raw(sql);
};