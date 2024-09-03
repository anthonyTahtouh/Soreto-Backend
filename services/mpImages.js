const AbstractCrudInterface = require('./CrudInterface');
const { S3Storage } = require('../utils/s3Storage.js');
const path = require('path');
const fs = require('fs');

const config = require('./../config/config');

class mpImages extends AbstractCrudInterface {
  findDestination(assetObjInfo, section) {
    const parsedObjInfo = JSON.parse(assetObjInfo);

    if (section === 'brand') {
      return `/${parsedObjInfo.urlId}`;
    }

    if (section === 'offer') {
      return `/${parsedObjInfo.brandUrlId}/offers/${parsedObjInfo.urlId}`;
    }

    if (section === 'category') {
      return `/categories/${parsedObjInfo.urlId}`;
    }

    if (section === 'blog') {
      let brandUrlId = parsedObjInfo.brandUrlId || (parsedObjInfo.brand ? parsedObjInfo.brand.urlId : null );
      if (brandUrlId) {
        return `/${brandUrlId}/blogs/${parsedObjInfo.urlId}`;
      }
      return `/blogs/${parsedObjInfo.urlId}`;
    }

    if (section === 'banner') {
      if (parsedObjInfo.brandUrlId) {
        return `/banners/brand/${parsedObjInfo.brandUrlId}`;
      }

      if (parsedObjInfo.offerUrlId) {
        return `/banners/offer/${parsedObjInfo.offerUrlId}`;
      }

      if (parsedObjInfo.categoryUrlId) {
        return `/banners/category/${parsedObjInfo.categoryUrlId}`;
      }
      return `/banners/soreto`;
    }

    if (section === 'flashCampaign') {
      return `/flashCampaign/${parsedObjInfo.urlId}`;
    }
  }

  async execute(file, assetObjInfo, section, asset) {
    try {
      const s3StorageService = new S3Storage();
      const newFileName = `${asset}_${file.filename}`;
      let destination = this.findDestination(assetObjInfo, section, asset);

      // concat destination to the bucket
      destination = `${config.MARKETPLACE.AWS_BUCKET}${destination}`;

      const result = await s3StorageService.saveFile(
        file.filename,
        newFileName,
        destination,
        file.mimetype
      );

      // Delete file in tmp folder
      const __dirname = path.resolve(path.dirname(''));
      const originalPath = path.join(__dirname, 'tmp', file.filename);
      await fs.promises.unlink(originalPath);

      let webLocation = result.Location;

      // is there any bucket url address configured?
      if(config.MARKETPLACE.AWS_BUCKET_BASE_DNS_URL){

        // replace the target url to use the configured base URL
        webLocation = `${config.MARKETPLACE.AWS_BUCKET_BASE_DNS_URL}/${result.Key}`;
      }

      return webLocation;
    } catch (e) {
      throw new Error(e);
    }
  }
}

const mpImageService = new mpImages();

module.exports = mpImageService;
