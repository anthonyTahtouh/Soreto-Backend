require('mailin-api-node-js');

const {find} = require('lodash');
var msClient = require('../../common/senecaClient');
const constants = require('../../config/constants');
const {promisify} = require('bluebird');

module.exports = {
  sendSimpleMail: function(to, replyTo, subject, message, variables = null, cc = null, templateName = null){
    var data = {
      'to': to,
      'replyTo': replyTo,
      'message': message,
      'subject': subject,
      'templateName': templateName,
      'cc': cc,
      'variables': variables,
      'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
    };

    var act = promisify(msClient.act, {context: msClient});

    return new Promise((resolve)=>{
      msClient.data = data;
      act(constants.EVENTS.SEND_SIMPLE_EMAIL,{data: data})
        .then((res)=>{
          resolve(res);
        })
        .catch(function (err) {
          resolve(err);
        });
    });
  },
  sendPostRewardDiscountMail: function(email,emailAttributes){
    var act = promisify(msClient.act, {context: msClient});
    return new Promise((resolve,reject)=>{
      var data = {
        'to': email,
        'emailAttributes': emailAttributes,
        'campaignVersionId': emailAttributes.campaignVersionId,
        'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
      };

      msClient.data = data;
      act(constants.EVENTS.SEND_POST_PURCHASE_DISCOUNT_MAIL,{data: data})
        .then((res)=>{
          if(res.err){
            return reject(res.err);
          }
          return resolve(res);
        })
        .catch(function (err) {
          return reject(err);
        });
    });
  },
  sendPostRewardDiscountMail_v2: function(orderPostReward, user, sharedUrl){
    var act = promisify(msClient.act, {context: msClient});
    return new Promise((resolve,reject)=>{
      var data = {
        emailAttributes: { orderPostReward, user, sharedUrl },
        headers: {'Content-Type': 'text/html;charset=iso-8859-1'}
      };

      msClient.data = data;
      act(constants.EVENTS.SEND_POST_REWARD_MAIL , { data })
        .then((res)=>{
          if(res.err){
            return reject(res.err);
          }
          return resolve(res);
        })
        .catch(function (err) {
          return reject(err);
        });
    });
  },
  sendTemplateMail: function({emails, emailAttributes, type, campaignVersionId}){

    if(typeof emails === 'string'){
      emails = [emails];
    }
    return new Promise((resolve,reject)=>{
      const sendEmail = (email)=>{

        var data = {
          emailAttributes,
          type,
          'to': email,
          'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
        };
        if(campaignVersionId){
          data.campaignVersionId = campaignVersionId;
        }
        var act = promisify(msClient.act, {context: msClient});
        return new Promise((resolve, reject)=>{
          msClient.data = data;
          act(constants.EVENTS.SEND_TEMPLATE_EMAIL,{data: data})
            .then((res)=>{
              resolve(res);
            })
            .catch(function (err) {
              reject(err);
            });
        });
      };

      var actions = emails.map(sendEmail);

      Promise.all(actions).then((responses)=>{
        if(find(responses,{'success':true})){
          return  resolve({'success':true}); // if one passes mark as success.
        }else{
          return reject(responses);
        }
      });
    });
  },
  sendMail: function(campaignVersionId, emails,emailAttributes){
    if(typeof emails === 'string'){
      emails = [emails];
    }
    return new Promise((resolve,reject)=>{
      const sendEmail = (email)=>{

        var data = {
          'campaignVersionId': campaignVersionId,
          'to': email,
          'emailAttributes': emailAttributes,
          'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
        };
        var act = promisify(msClient.act, {context: msClient});
        return new Promise((resolve)=>{
          msClient.data = data;
          act(constants.EVENTS.SEND_FRIEND_EMAIL,{data: data})
            .then((res)=>{
              resolve(res);
            })
            .catch(function (err) {
              resolve(err);
            });
        });
      };

      var actions = emails.map(sendEmail);

      Promise.all(actions).then((responses)=>{
        if(find(responses,{'success':true})){
          return  resolve({'success':true}); // if one passes mark as success.
        }else{
          reject(responses);
        }
      });
    });
  }
};