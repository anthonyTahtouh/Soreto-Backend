var config = require('../config/config');

// Superagent mock library config file
module.exports = [
  {
    pattern: config.SOCIAL.FACEBOOK.URL_ACCESSTOKEN,
    // eslint-disable-next-line no-unused-vars
    fixtures: function (match, params, headers) {},
    // eslint-disable-next-line no-unused-vars
    get: function (match, data) {
      return {
        text: {
          access_token: '0GwSWZOzUGsgCv6ThA2t0vZASOEKGCn9IQFPIuTwx8e1kBb11ERG50zvwKwEZVqZ3iwXFJub1BkDNCztJUZA0hokLSb22qIfRycIj3bKfOPreUxGCcPSYPhTcL10D6eNOWNXnjQjiebiztKOLtS9SyXuy7vD3eySyOYXbYx4Uv',
          token_type: 'bearer',
          expires_in: 5177053
        }
      };
    }
  },
  {
    pattern: config.SOCIAL.FACEBOOK.URL_PHOTOS,
    // eslint-disable-next-line no-unused-vars
    fixtures: function (match, params, headers) {},
    // eslint-disable-next-line no-unused-vars
    post: function (match, data) {
      return {
        text: JSON.stringify({
          id: '10153829549786847'
        })
      };
    }
  },
  {
    pattern: config.SOCIAL.FACEBOOK.URL_FEED,
    // eslint-disable-next-line no-unused-vars
    fixtures: function (match, params, headers) {},
    // eslint-disable-next-line no-unused-vars
    post: function (match, data) {
      return {
        text: JSON.stringify({
          id: '10153805706406847_10153829013741847'
        })
      };
    }
  },
  {
    pattern: config.SOCIAL.FACEBOOK.URL_USERINFO,
    // eslint-disable-next-line no-unused-vars
    fixtures: function (match, params, headers) {},
    // eslint-disable-next-line no-unused-vars
    get: function (match, data) {
      return {
        text: JSON.stringify({
          id: '10153805700000000',
          first_name: 'Test',
          last_name: 'User',
          birthday: '08/02/1987',
          email: 'test@test.com',
          location: { id: '106078429431815', name: 'London, United Kingdom' },
          gender: 'male'
        })
      };
    }
  }
];