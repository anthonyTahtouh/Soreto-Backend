exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_user_removal_js;
  CREATE OR REPLACE VIEW reverb.agg_user_removal_js AS
   SELECT u."_id",
  	u.created_at AS "userCreatedAt",
  	u.email,
  	u.first_name AS "firstName",
    u.roles,
    client."_id" as "clientId",
    (
	 SELECT jsonb_agg(item) from (SELECT client_id as "clientId", _id as "shortUrlId", created_at as "createdAt", type, short_url as "shortUrl", social_platform as "socialPlatform" from reverb.shared_url su 
		 where su.client_id  = client."_id" and
		 su.user_id = u."_id" and
		 SU."type" = 'SHARED' and
		 su.created_at >=  to_char(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM-01')::date ORDER BY su.created_at DESC) as item
	) as "sharedUrlFields",
	(
	 SELECT count(*) >= 1 as isAdmin  FROM reverb."user" CROSS JOIN jsonb_array_elements(roles) WHERE value::text = (SELECT concat('"',_id, '"' ) FROM reverb."role" r WHERE r.name in ('admin') ) and "_id"  = u._id
	) as "isAdmin"
  FROM reverb."user" AS u
  LEFT JOIN reverb.shared_url AS su ON su.user_id  = u."_id"
  left join reverb.client as client on su.client_id = client."_id"
  WHERE u.client_id IS null and SU."type" = 'SHARED' AND su.created_at >=  to_char(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM-01')::date 
  GROUP BY u."_id",
  	u.created_at,
  	u.email,
    u.roles,
    client."_id"
  `);
};
