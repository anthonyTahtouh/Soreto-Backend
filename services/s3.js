var fs = require('fs');
var mime = require('mime');

var config = require('../config/config');

module.exports = {
  getClient: function () {
    var self = this;
    var client = (process.env.NODE_ENV && process.env.NODE_ENV === 'test') ?
      self.getMockS3Client() :
      self.getRealS3Client();
    return client;
  },
  getMockS3Client: function () {
    var AWSMock = require('mock-aws-s3');
    AWSMock.config.basePath = '/tmp/buckets/';
    var client = AWSMock.S3({
      params: { Bucket: 'test' }
    });

    return client;
  },
  getRealS3Client: function () {
    var AWS = require('aws-sdk');
    var creds = {accessKeyId: config.AWS.ACCESS_KEY, secretAccessKey: config.AWS.ACCESS_SECRET};
    AWS.config.update({
      credentials: creds,
      region: config.AWS.REGION
    });

    var s3 = new AWS.S3();
    return s3;
  },
  uploadFile: function (bucket, filePath, destKey) {
    var self = this;

    var sourceStream = fs.createReadStream(filePath);
    return self.uploadStream(bucket, sourceStream, destKey);
  },
  uploadStream: function (bucket, sourceStream, destKey) {
    var self = this;

    var s3 = self.getClient();
    return new Promise(function (resolve, reject) {
      var contentType = mime.lookup(destKey);

      var params = {
        Bucket: bucket,
        Key: destKey,
        ACL: 'public-read',
        Body: sourceStream,
        ContentType: contentType
      };

      s3.putObject(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
};
