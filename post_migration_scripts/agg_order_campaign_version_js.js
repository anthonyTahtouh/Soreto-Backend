exports.seed = function(knex) {
  return knex.raw(`
          
            DROP VIEW IF EXISTS reverb.agg_order_campaign_version_js;
        
            CREATE OR REPLACE VIEW reverb.agg_order_campaign_version_js AS
            select
                'soreto' as "sourceOrigin"
                , o._id as "orderId"
                , o.created_at as "orderDate"
                , o.updated_at as "updatedAt"
                , o.status as "orderStatus"
                , su."_id" as "sharedUrlId"
                , su.campaign_version_id as "campaignVersionId"
                , o.override_campaign_version_id as "overrideCampaignVersionId"
            from 
                reverb."order" o
                inner join
                reverb.shared_url su
                on
                su."_id" = o.meta->>'sharedUrlId'
                left join
                reverb.order_post_reward opr
                on
                opr.order_id = o."_id"
            where
                -- ignore values already on Oreder Post Reward Table
                opr.order_id is null
            
            union all

            select
                'external' as "sourceOrigin"
                , eo._id as "orderId"
                , eo.transacted_at as "orderDate"
                , eo.updated_at as "updatedAt"
                , eo.status as "orderStatus"
                , su."_id" as "sharedUrlId"
                , su.campaign_version_id as "campaignVersionId"
                , sua.override_campaign_version_id as "overrideCampaignVersionId"
            from 
                reverb."external_order" eo
                inner join
                reverb.shared_url_access sua
                on
                sua._id = eo.shared_url_access_id
                inner join
                reverb.shared_url su
                on
                su."_id" = sua.shared_url_id
                left join
                reverb.order_post_reward opr
                on
                opr.external_order_id = eo."_id"
            where
                -- ignore values already on Oreder Post Reward Table
                opr.external_order_id is null
		
          `);
};