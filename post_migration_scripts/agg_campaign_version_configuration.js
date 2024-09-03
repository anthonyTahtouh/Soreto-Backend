exports.seed = function(knex) {
  return knex.raw(`
        DROP VIEW IF EXISTS reverb.agg_campaign_version_configuration_js;
        CREATE OR REPLACE VIEW reverb.agg_campaign_version_configuration_js AS
        select 
            cpv."_id" as "campaignVersionId",    
            cpv."name" as "campaignVersionName",
            cpv."active" as "campaignVersionActive",
            cpv."linkExpiryDays" as "campaignVersionPublicLinkExpirationDays",
            cpv."privateLinkExpiryDays" as "campaignVersionPrivateLinkExpirationDays",
            cpv."publicSharedUrlExpiresAt" as "campaignVersionPublicSharedUrlExpiresAt",
            cpv."privateSharedUrlExpiresAt" as "campaignVersionPrivateSharedUrlExpiresAt",
            cp."_id" as "campaignId",
            cp.description  as "campaignDescription",
            cp.expiry as "campaignExpiry",
            cp."startDate" as "campaignStartDate",
            cp.active as "campaignActive",
            cp."shortUrlCustomStringComponent" as "campaignShortUrlCustomStringComponent",
            cli."name" as "clientName",
            cli.active as "clientActive",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_PERSONAL_NO_CLICK_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationPersonalNoClickAfterDays",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_PERSONAL_NO_ORDER_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationPersonalNoOrderAfterDays",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_SHARER_POST_REWARD_NO_CLICK_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationSharerPostRewardNoClickAfterDays",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_SHARER_POST_REWARD_NO_ORDER_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationSharerPostRewardNoOrderAfterDays",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_FRIEND_POST_REWARD_NO_CLICK_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationFriendPostRewardNoClickAfterDays",
            (SELECT reverb.func_get_var('SHARED_URL_NOTIFICATION_FRIEND_POST_REWARD_NO_ORDER_AFTER_DAYS', 'CAMPAIGN_VERSION.USER_JOURNEY', cpv."_id")) as "sharedUrlNotificationFriendPostRewardNoOrderAfterDays"
        from 
            reverb.campaign_version_js cpv
        inner join
            reverb.campaign_js cp on cp."_id" = cpv."campaignId"
        inner join
            reverb.client_js cli on cli."_id" = cp."clientId"
      `);
};