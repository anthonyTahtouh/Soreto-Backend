
exports.seed = function(knex) {
  return knex.raw(`
  
    drop view if exists reverb.agg_user_tracking_flow_js;
  
    create or replace view reverb.agg_user_tracking_flow_js
    as
    
    select    
	  cli._id as client_id
  	, cli.name as client_name
    , u.email as user_email
    , su._id as su_id
    , su.created_at as su_creation
    , su.source_client_order_id as su_gen_order_id
    , su.type as su_type
    , su.meta->>'ipAddress' as su_ip
    , su.meta->>'userAgent' as su_userAgent
    , su.short_url as su_short_url
    , cpv.name as cpv_name
    , sua._id as sua_id
    , sua.created_at as sua_access_date
    , sua.meta->>'ipAddress' as sua_ip
    , sua.meta->>'userAgent' as sua_userAgent
    , o.created_at as client_order_creation
    , o.client_order_id as client_order_id
    , o.status as client_order_status
    , o.meta->>'ipAddress' as client_order_ip
	, o.meta->>'userAgent' as client_order_userAgent
    , o.shared_url_access_id as client_order_shared_url_access_id
    , eo.created_at as external_client_order_creation
    , eo.client_order_id as external_client_order_id
    , eo.status as external_client_order_status
    , eo.meta->>'ipAddress' as external_client_order_ip
	, eo.meta->>'userAgent' as external_client_order_userAgent
	, eo.shared_url_access_id as external_client_order_shared_url_access_id
from
    reverb.user u
    left join
    reverb.shared_url su on su.user_id = u._id
    left join
    reverb.campaign_version cpv on cpv._id = su.campaign_version_id
    left join
    reverb.campaign cp on cp._id = cpv.campaign_id
    left join
    reverb.client cli on cli._id = cp.client_id
    left join
    reverb.shared_url_access sua on sua.shared_url_id = su._id
    left join
    reverb.order o on o.shared_url_access_id = sua._id
    left join
    reverb.external_order eo on eo.shared_url_access_id = sua._id
  order by
    sua.created_at asc
`);
};
