var routePerms = [
  {
    'route': '/users',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/current',
    'action': 'get',
    'roles': ['admin', 'client', 'clientUser', 'mpUser', 'user']
  },
  {
    'route': '/users/autoenrol',
    'action': 'post',
    'roles': ['admin', 'client']
  },
  {
    'route': '/users/:userId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId',
    'action': 'put',
    'roles': ['admin', 'mpUser', 'user']
  },
  {
    'route': '/users/:userId/mpRefresh',
    'action': 'post',
    'roles': ['admin', 'mpUser', 'user']
  },
  {
    'route': '/users/:userId/password',
    'action': 'put',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/users/:userId/roles',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/socialauths',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/socialauths',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/socialauths',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls/meta',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls/meta/count',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/orders',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls/counts/socialclicks',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/sharedurls/counts/socialearnings',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/activity',
    'action': 'get',
    'roles' : ['admin']
  },
  {
    'route': '/users/:userId/activity/count',
    'action': 'get',
    'roles' : ['admin']
  },
  {
    'route': '/users/:userId/withdrawals',
    'action': 'post',
    'roles' : ['admin']
  },
  {
    'route': '/users/:userId/withdrawals',
    'action': 'get',
    'roles' : ['admin']
  },
  {
    'route': '/users/:userId/withdrawals/:requestId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/withdrawals/:requestId/cancel',
    'action': 'put',
    'roles' : ['admin']
  },
  {
    'route': '/clients',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/clients/listings',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/listings/all',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/listing/giftCardReward',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/status',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/clients/users',
    'action': 'post',
    'roles': ['admin', 'client']
  },
  {
    'route': '/clients/:clientId',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId',
    'action': 'put',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/commission',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/sharedurls',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/sharedurls/meta',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/products/meta',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/products/meta/count',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/sharedurls/counts/socialclicks',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/sharedurls/counts/socialshares',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/secret',
    'action': 'post',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/clients/:clientId/orders/:clientOrderId/cancel',
    'action': 'put',
    'roles': ['admin', 'client', 'clientUser']
  },
  {
    'route': '/clients/:clientId/sharedurls/counts/socialearnings',
    'action': 'get',
    'roles': ['admin','client','clientUser']
  },
  {
    'route': '/clients/:clientId/activity',
    'action': 'get',
    'roles': ['admin','client','clientUser']
  },
  {
    'route': '/clients/:clientId/activity/count',
    'action': 'get',
    'roles': ['admin','client','clientUser']
  },
  {
    'route': '/clients/:clientId/orders/:orderId',
    'action': 'put',
    'roles': ['admin', 'client','clientUser']
  },
  {
    'route': '/clients/:clientId/reports/dailytraction',
    'action': 'get',
    'roles': ['admin', 'client','clientUser']
  },
  {
    'route': '/clients/:clientId/reports/dailytraction/count',
    'action': 'get',
    'roles': ['admin', 'client','clientUser']
  },
  {
    'route': '/clients/:clientId/merchant_assoc',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/clients/merchantId/:merchantId/affiliateName/:affiliateName',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/orders',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/orders',
    'action': 'post',
    'roles': ['admin', 'client']
  },
  {
    'route': '/orders/:orderId/cancel',
    'action': 'put',
    'roles': ['admin', 'client']
  },
  {
    'route': '/postreward/harvest/clients',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/postreward/harvest/postRewardCampaignVersions',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/postreward/harvest/:campaignVersionId/orders',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/postreward/orders',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/postreward/orders',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/:orderPostRewardId/orders',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/postreward/order/log',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/:orderPostRewardId/users',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/:orderPostRewardId/sharedUrl',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/:orderPostRewardId/email',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/:orderPostRewardId/validator',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/postreward/simulate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postconversionreward/fire',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postconversionreward/fire/:orderId',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/external_order/:orderId/updated',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/socialpost',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/socialauths',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/socialauths',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/uploadimage',
    'action': 'post',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/roles/:roleId',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/roles',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/sharedurls',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/sharedurls/access',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/products/trending',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/products',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/categories',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/categories/:categoryId/products',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/rank',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/clients/all/stats',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/liveClients',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/liveRewards',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/liveRewardsBasic',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/auditOriginDomains',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/auditOriginUrls',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/bi/stats',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/v2/bi/stats',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/v2/bi/clientStats',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/v2/bi/clientOrderSummary',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/bi/statsByChannel',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/bi/commissionsByMonth',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/bi/performanceByMonth',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/reports/liveintegration',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/tracking',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/utmCampaign',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reports/breakage',
    'action': 'get',
    'roles': ['admin', 'financial']
  },
  {
    'route': '/reports/tracking/usersAccess',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/support/usertrackingflow',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/support/ordertrackingflow',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/client/stats',
    'action': 'get',
    'roles': ['clientUser']
  },
  {
    'route': '/clients/:clientId/stats',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/users/:userId/status',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaign/:campaignId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaign/:campaignId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/campaign/:campaignId/copyDeep',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaign/cache/refreshSuperCampaign',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/clients/:clientId/cache/flushTagDetails',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaign/all',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaign',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaign/listings',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaign/active',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/displayBlock/all',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/displayBlock/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/displayBlock/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/displayBlock',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/displayBlock',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/codeBlock/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/codeBlock/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/codeBlock',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/codeBlock',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/typeValues/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/all',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/list',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/:campaignVersionId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/:campaignVersionId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/:campaignVersionId/copyDeep',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/refreshcache',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/saas/copyTemplate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion/saas/assets/:campaignId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reward/:rewardId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/reward',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/reward/client/:clientId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reward/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reward/:rewardId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/reward/campaignVersion/:campaignVersionId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/:rewardDiscountCodeId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/reward/:rewardId',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/:rewardDiscountCodeId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/:campaignVersionId/:rewardType/:userId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/:rewardId/validDiscountCode',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardDiscountCode/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPool/:rewardPoolId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPool/:rewardPoolId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/rewardPool',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/rewardPool',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPool/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamic',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamic',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/postreward/report',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamic/:rewardPoolDynamicId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamic/:rewardPoolDynamicId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamic/:rewardPoolDynamicId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamicItem',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamicItem/:rewardPoolDynamicItemId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/rewardPoolDynamicItem/:rewardPoolDynamicItemId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/campaignVersion',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate/:emailTemplateId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate/:emailTemplateId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate/:emailTemplateId/copy',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplateType/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplateType/:emailTemplateTypeId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplateType',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplateType',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/associateEmailToCampaignVersion/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/emailTemplate/client/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/associateEmailToCampaignVersion/:associateEmailToCampaignVersionId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/associateEmailToCampaignVersion',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/associateEmailToCampaignVersion',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/debugPage/lightbox',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/demoStore/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/demoStore/:demoStoreId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/demoStore',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/demoStore',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/environment/list',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userManagement/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userManagement/responsibles',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userManagement/:userManagementId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userManagement',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/userManagement',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/userManagement/email/:email',
    'action': 'get',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/userManagement/unsubscribed',
    'action': 'put',
    'roles': ['admin', 'clientUser']
  },
  {
    'route': '/affiliate/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/affiliate',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/affiliate/:affiliateId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/affiliate/:affiliateId',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/affiliate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/assocclientaffilliate',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/assocclientaffilliate/:assocclientaffilliateId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/assocclientaffilliate/:assocclientaffilliateId',
    'action': 'patch',
    'roles': ['admin']
  },
  {
    'route': '/assocclientaffilliate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/assocclientaffilliate/:assocclientaffilliateId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/byChannel/totalClientStatsByPeriod',
    'action': 'get',
    'roles': ['clientUser']
  },
  {
    'route': '/byChannel/clientStatsPerChannelByPeriod',
    'action': 'get',
    'roles': ['clientUser']
  },
  {
    'route': '/client/:clientId/impersonate',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/unimpersonate',
    'action': 'get',
    'roles': ['clientUser','admin']
  },
  {
    'route': '/country/all',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/countryCode/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/countryCode/:countryCodeId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/countryCode/:countryCodeId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/countryCode',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/order/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/order/joined/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/valueOrderStatus',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/orders/:orderId/history',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/keyEmailTemplateType/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/keyEmailTemplateType',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/keyEmailTemplateType/:keyEmailTemplateTypeId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/keyEmailTemplateType/:keyEmailTemplateTypeId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/keyEmailTemplateType',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/globalVars',
    'action': 'get',
    'roles': ['admin', 'clientUser', 'client']
  },
  {
    'route': '/globalVars',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/blacklist/user/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/blacklist/user',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/blacklist/user/refresh',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/blacklist/user/:blacklistId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/blacklist/user/:blacklistId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/wizard/:clientUniqueId/:campaignTemplate',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/feedWizard/brand/:feedId',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/feedWizard/offer/:feedId',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/dynamicMenu/userMenu',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/dynamicMenu/page',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/dynamicMenu/:dynamicMenuId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/dynamicMenu/:dynamicMenuId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/dynamicPage',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/dynamicPage/:dynamicMenuId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/dynamicPage/:dynamicPageId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/dynamicPage/:dynamicPageId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/refresh',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/fill_collections',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/vanish_collections',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories/:categoryId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories/:categoryId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories/:categoryId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/categories/:categoryId/rank/:rankId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId/categories',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId/categories',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId/categories/:categoryId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId/categories/:categoryId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/:brandId/rank',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/brands/merchantId/:merchantId/affiliateName/:affiliateName',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId/rank',
    'action': 'put',
    'roles': ['admin'],
  },
  {
    'route': '/mp/offers/:offerId/categories',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId/categories',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId/categories/:categoryId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/offers/:offerId/categories/:categoryId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs/:blogId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs/:blogId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs/:blogId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/blogs/:blogId/rank',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/banners',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/banners/:bannerId',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/banners',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/banners/:bannerId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/banners/:bannerId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/notifications',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/notifications',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/notifications/publish',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/notifications/:notificationId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/notifications/:notificationId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/mp/assetsUpload',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/notifications/campaignVersion',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/notifications/campaignVersion/:cpvId/sharedUrls',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/notifications/sharedUrl/:suId/send',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/notifications/sharedUrl/:suId/sharedUrlAccessCount',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/notifications/sharedUrl/:suId/orderCount',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/notifications/simulate/campaignVersion/:cpvId/send',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/rank/latestRank/:rankName',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type/reprove',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type/publish',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type/buildReview',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type/buildApproved',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:feedId/:type/unreject',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/operation/feeds/:type',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/flashCampaigns',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/mp/flashCampaign',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/mp/flashCampaign/:flashCampaignId',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/mp/flashCampaign/:flashCampaignId',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/currency',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/asset',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/asset/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/asset/compile',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/asset',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/asset',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/asset/:id',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/abTest/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/abTest',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/abTest/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/abTest/:id',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/abTest',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore/:id',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore/agg',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation/agg',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentation/:id',
    'action': 'delete',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationScore',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool/agg',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool/:id',
    'action': 'get',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool',
    'action': 'post',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool/:id',
    'action': 'put',
    'roles': ['admin']
  },
  {
    'route': '/userSegmentationPool/:id',
    'action': 'delete',
    'roles': ['admin']
  },
];

module.exports = routePerms;