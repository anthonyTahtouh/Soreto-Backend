
let varDefinitions = [

  // GLOBAL
  {
    setting_key: 'ANTI_FRAUD',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Global switcher to enable or disable anti-fraud features',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },


  // LIGHTBOX


  // IP
  {
    setting_key: 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Lightbox blacklisted IP anti-fraud rule switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },

  // IDENTITY
  {
    setting_key: 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Lightbox blacklisted Web Identity anti-fraud rule switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },

  // EMAIL
  {
    setting_key: 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Lightbox blacklisted email anti-fraud rule switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },



  // LANDING PAGE



  // COOKIE
  {
    setting_key: 'ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Cookie approach anti-fraud rule switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },

  // BLOCKED DOMAIN
  {
    setting_key: 'ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Blocked domain anti-fraud rule switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },

  // IP
  {
    setting_key: 'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Black listed IP anti-fraud restriction switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },

  // IDENTITY
  {
    setting_key: 'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY',
    context: 'CLIENT.ANTI_FRAUD',
    type: 'BOOLEAN',
    description: 'Black listed Web Identity anti-fraud restriction switcher',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  }
];

exports.up = function (knex) {

  return knex('reverb.var_definition')
    .insert(varDefinitions);
};

exports.down = function (knex) {

  return knex('reverb.var_definition')
    .delete()
    .where(
      {
        context: 'CLIENT.ANTI_FRAUD'
      });
};
