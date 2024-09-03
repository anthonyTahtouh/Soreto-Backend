var moment = require('moment');

var facebook = {
  getInfoObj: function (socialInfo) {
    return {
      firstName: socialInfo.first_name || null,
      lastName: socialInfo.last_name || null,
      birthday: moment(socialInfo.birthday, 'MM-DD-YYYY').toISOString() || null,
      email: socialInfo.email || null,
      location: socialInfo.location ? socialInfo.location.name : null,
      gender: socialInfo.gender || null,
      meta: socialInfo
    };
  }
};

var twitter = {
  getInfoObj: function (socialInfo) {
    return {
      firstName: socialInfo.name.split(' ')[0] || null,
      lastName: socialInfo.name.split(' ')[socialInfo.name.split(' ').length-1] || null,
      birthday: null,
      email: socialInfo.email || null,
      location: socialInfo.location || null,
      gender: null,
      meta: socialInfo
    };
  }
};

var pinterest = {
  getInfoObj: function (socialInfo) {
    return {
      firstName: socialInfo.first_name || null,
      lastName: socialInfo.last_name || null,
      birthday: null,
      email: null,
      location: null,
      gender: null,
      meta: socialInfo
    };
  }
};

module.exports = {
  facebook: facebook,
  twitter: twitter,
  pinterest: pinterest
};