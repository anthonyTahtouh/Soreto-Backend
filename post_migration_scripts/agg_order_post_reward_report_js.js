exports.seed = function (knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_order_post_reward_report_js;

  CREATE OR REPLACE VIEW reverb.agg_order_post_reward_report_js 
  AS 
  select opr._id as id,
    opr.status as status,
    opr.created_at as "oprCreatedAt",
    COALESCE(o.created_at, eo.created_at) as "orderDate",
    cpv.name as "campaingVersionName",
    us.email as "userEmail",
    rw."name" as "rewardName",
    su.meta -> 'assignedCodeId' as "rewardRetrieved",
    cp.client_id as "clientId",
    cl.name as "clientName",
    opr.order_user_role as "orderUserRole"
  from reverb.order_post_reward opr
      left join reverb.order o on o._id = opr.order_id 
      left join reverb.external_order eo on opr.external_order_id =eo._id 
      left join reverb.campaign_version cpv on opr.campaign_version_id  = cpv._id 
      left join reverb.campaign cp on cpv.campaign_id = cp._id
      left join reverb.client cl on cl._id = cp.client_id 
      left join reverb.user us on opr.user_id = us._id 
      left join reverb.shared_url su on opr.shared_url_id = su._id 
      left join reverb.reward rw on opr.reward_id = rw._id
  order by "oprCreatedAt" desc`
  );
};

