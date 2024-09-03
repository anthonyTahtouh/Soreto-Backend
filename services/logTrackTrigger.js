const _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

const constants = require('../config/constants');
const msClient = require('../common/senecaClient');

module.exports = {
  createLog: function (meta, cb) {

    db('log_track_trigger_js')
      .returning('*')
      .insert({
        meta: JSON.stringify(meta)
      })
      .then(function (response) {

        // send live data
        msClient.act(_.extend(constants.EVENTS.SEND_LIVE_TRACK_DATA,
          {
            data: {
              meta: meta,
              type: 'track_trigger'
            }}
        ));

        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'LogTrackTrigger'));
      });
  }
};