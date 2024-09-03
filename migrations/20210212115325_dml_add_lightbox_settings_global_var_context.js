let varDefinitions = [

  {
    setting_key: 'MINIMIZATION_ENABLED',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'BOOLEAN',
    description: 'Enables lightbox minimization.',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'LAUNCH_MINIMIZED',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'BOOLEAN',
    description: 'Launches lightbox in mini state intead of full screen.',
    fallback_value: [false],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'MINI_LARGE',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'JSON',
    description: 'Lightbox Mini settings for large devices.',
    fallback_value: [
      {
        minWidthBreakpointPx: 992,
        dimensions: {
          width: '300px',
          heigth: '100px',
        },
        position: {
          top: null,
          bottom: '0px',
          left: null,
          right: '0px',
        },
        closeButton: {
          show: true
        }
      }
    ],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'MINI_MEDIUM',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'JSON',
    description: 'Lightbox Mini settings for medium devices.',
    fallback_value: [
      {
        minWidthBreakpointPx: 768,
        dimensions: {
          width: '100%',
          heigth: '100px',
        },
        position: {
          top: null,
          bottom: '0px',
          left: null,
          right: '0px',
        },
        closeButton: {
          show: true
        }
      }
    ],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'MINI_SMALL',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'JSON',
    description: 'Lightbox Mini settings for small devices.',
    fallback_value: [
      {
        minWidthBreakpointPx: 0,
        dimensions: {
          width: '100%',
          heigth: '100px',
        },
        position: {
          top: null,
          bottom: '0px',
          left: null,
          right: '0px',
        },
        closeButton: {
          show: true
        }
      }
    ],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'TOGGLE_BUTTON_INNER_HTML',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'TEXT',
    description: 'Inner HTML for toggle button',
    fallback_value: ['<span>-</span>'],
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
        context: 'CAMPAIGN_VERSION.LIGHTBOX'
      });
};
