const aws = require('aws-sdk');
const path = require('path');
const fs = require('fs');
// var config = require('../config/config');

class S3Storage {
  constructor() {
    this.client = new aws.S3({
      region: 'sa-east-1',
    });
  }

  async saveFile(originalFileName, newFileName, destination = '', ContentType = 'image/jpeg') {
    const __dirname = path.resolve(path.dirname(''));
    const originalPath = path.join(__dirname, 'tmp', originalFileName);

    var AWS = require('aws-sdk');
    // Set the region
    AWS.config.update({ region: 'sa-east-1' });

    // Create S3 service object
    var s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    // call S3 to retrieve upload file to specified bucket
    var uploadParams = {
      Bucket: destination,
      Key: '',
      Body: '',
      ACL: 'public-read',
      ContentType,
    };

    // Configure the file stream and obtain the upload parameters
    var fileStream = fs.createReadStream(originalPath);
    fileStream.on('error', function (err) {
      console.log('File Error', err);
    });
    uploadParams.Body = fileStream;
    // uploadParams.Key = path.basename(filename);
    uploadParams.Key = newFileName;

    // call S3 to retrieve upload file to specified bucket
    return s3
      .upload(uploadParams, async function (err, data) {
        if (err) {
          console.log('Error', err);
        }
        if (data) {
          console.log('Upload Success', data.Location);
        }
      })
      .promise();
  }

  async deleteFile(bucket, filename) {
    await this.client
      .deleteObject({
        Bucket: bucket,
        Key: filename,
      })
      .promise();
  }
}

module.exports = { S3Storage };
