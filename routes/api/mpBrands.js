const express = require('express');
const router = express.Router();
const _ = require('lodash');
const mpBrandsServices = require('../../services/mpBrands');
const mpBrandCategoriesServices = require('../../services/mpBrandCategories');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
var clientService = require('../../services/client');


/*
|--------------------------------------------------------------------------
| Marketplace brands API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/brands', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  const query = req.query;

  try {
    var brands = await mpBrandsServices.getPage({}, query, ['name']);

    if(brands && !_.isEmpty(brands)) {
      responseHandler.result(res, brands);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/brands/:brandId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var brandId = req.params.brandId;
    var brand = await mpBrandsServices.getById(brandId);

    if (brand) {

      // Enrich the result with brand categories object
      let cat = await mpBrandCategoriesServices.getJoinedDataByFilter({mpBrandId: brand._id}, 'mp_category_js', 'mpCategoryId', 'mp_category_js._id');

      if(cat && !_.isEmpty(cat)){
        brand.categories = cat;
      }

      responseHandler.result(res, brand);
    } else {
      responseHandler.resultNotFound(res);
    }
    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/brands', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    // create brand
    const brandObj = mpBrandsServices.pick(req.body);

    // payload validation
    payloadValidatorHandler
      .payload(brandObj)
      .cantBeNullOrEmpty(mpBrandsServices.requiredProps())
      .cantHaveEmptySpace(['staticId', 'urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let client = await validClient(brandObj, res);
    if (!client) {
      return;
    }

    let duplicated = await mpBrandsServices.checkUnique(req.body);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others brands. [${duplicated.join(',')}]`);
      return;
    }

    brandObj.createdAt = new Date();
    brandObj.updatedAt = new Date();

    var brand = await mpBrandsServices.create(brandObj);

    responseHandler.resultNew(res, brand);

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/mp/brands/:brandId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    const brandId = req.params.brandId;
    const brandObj = mpBrandsServices.pick(req.body);

    brandObj.updatedAt = new Date();

    let client = await validClient(brandObj, res);
    if (!client) {
      return;
    }

    let duplicated = await mpBrandsServices.checkUnique(req.body, brandId);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others brands. [${duplicated.join(',')}]`);
      return;
    }

    var updatedBrand = await mpBrandsServices.update(brandId, brandObj);

    responseHandler.resultUpdated(res, updatedBrand);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.delete('/mp/brands/:brandId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var brandId = req.params.brandId;

    if (_.isEmpty(brandId)) {
      responseHandler.errorComposer(res, 'Invalid brand id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpBrandsServices.deleteBrand(brandId);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    error;
    responseHandler.errorComposer(res, error);
  }

});

/*
|--------------------------------------------------------------------------
| Marketplace brands/:brandId/categories API endpoint
|--------------------------------------------------------------------------
*/
router.get('/mp/brands/:brandId/categories', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var brandId = req.params.brandId;
    var brandCategories = await mpBrandCategoriesServices.getPage({mpBrandId: brandId});

    if (brandCategories && !_.isEmpty(brandCategories)) {
      responseHandler.result(res, brandCategories);
    } else {
      responseHandler.resultNotFound(res);
    }
    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/brands/:brandId/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var brandId = req.params.brandId;
    var categoryId = req.params.categoryId;
    var brandCategories = await mpBrandCategoriesServices.getPage({mpBrandId: brandId, mpCategoryId: categoryId});

    if (brandCategories && !_.isEmpty(brandCategories)) {
      responseHandler.result(res, brandCategories);
    } else {
      responseHandler.resultNotFound(res);
    }
    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.delete('/mp/brands/:brandId/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var brandId = req.params.brandId;
    var categoryId = req.params.categoryId;

    if (_.isEmpty(brandId)) {
      responseHandler.errorComposer(res, 'Invalid brand id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      return;
    }
    if (_.isEmpty(categoryId)) {
      responseHandler.errorComposer(res, 'Invalid category id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      return;
    }

    let filter = {mpBrandId: brandId, mpCategoryId: categoryId};
    var result = await mpBrandCategoriesServices.deleteByFilter(filter);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.put('/mp/brands/:brandId/rank', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  const { brandId } = req.params;

  try {

    const { startIndex, endIndex } = req.body;

    const validBrandId = await mpBrandsServices.getById(brandId);

    if (!validBrandId) {
      responseHandler.errorComposer(res, 'Invalid brand id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    const brands = await mpBrandsServices.rankBrands(startIndex, endIndex);

    responseHandler.result(res, brands);

  } catch(error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/brands/:brandId/categories', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    // create brand
    const brandCategoryObj = mpBrandCategoriesServices.pick(req.body);

    // payload validation
    payloadValidatorHandler
      .payload(brandCategoryObj)
      .cantBeNullOrEmpty(mpBrandCategoriesServices.requiredProps())
      .cantHaveEmptySpace(['mpBrandId','mpCategoryId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    var brandCategory = await mpBrandCategoriesServices.create(brandCategoryObj);

    responseHandler.resultNew(res, brandCategory);

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.get('/mp/brands/merchantId/:merchantId/affiliateName/:affiliateName',  authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let result = await mpBrandsServices.getBrandByMerchantId({merchantId: req.params.merchantId, affiliateName: req.params.affiliateName.toLocaleLowerCase() });

  if(result == null) {
    return res.status(404).json('Brand Id not found');
  }

  return res.status(200).json(result);
});

const validClient = async function(brandObj, res){
  let client = await new Promise((resolve, reject) => {
    clientService.getClient(brandObj.clientId, (err, data) => {if(err) return reject(err); else resolve(data);});
  });

  if (brandObj.active === true && !client.mpActive) {
    responseHandler.errorComposer(res,
      'Marketplace disabled',
      responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
      'mpActive',
      `The brand cannot be activated because the related client is inactive.`);
    return false;
  }

  return true;
};

module.exports = router;
