
exports.seed = function(knex) {
  return knex.raw(`
  DROP VIEW IF EXISTS reverb.agg_campaign_active_js;
  CREATE OR REPLACE VIEW reverb.agg_campaign_active_js AS
  select
    c._id,
    c.client_id as "clientId",
    c.direct_share as "directShare",
    c.soreto_tag as "soretoTag",
    c.created_at as "createdAt",
    c.expiry,
    c.start_date as "startDate",
    c.active,
    c.super_campaign as "superCampaign",
    coalesce(cc_cli.code, cc.code) as "countryCode"
  from 
    reverb.campaign c
    left join 
      reverb.country co
      on 
      c.country_id = co._id
    left join
      reverb.country_code cc
      on			
      co._id = cc.country_id
      and
      cc.client_id is null
    left join
      reverb.country_code cc_cli
      on			
      co._id = cc_cli.country_id
      and
      cc_cli.client_id = c.client_id
    where
      c.type = 'on_site_referral' -- only b2b campaigns
  `);
};