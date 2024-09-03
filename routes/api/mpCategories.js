const express = require('express');
const router = express.Router();
const _ = require('lodash');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

const mpCategoriesService = require('../../services/mpCategories');
const authService = require('../../services/auth');


/*
|--------------------------------------------------------------------------
| Marketplace Category API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/categories', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  const query = req.query;

  try {

    var categories = await mpCategoriesService.getPage({}, query, ['name']);

    if(categories && !_.isEmpty(categories)){
      responseHandler.result(res, categories);
    }else{
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var categoryId = req.params.categoryId;

    var category = await mpCategoriesService.getById(categoryId);

    if(category){
      responseHandler.result(res, category);
    }else{
      responseHandler.resultNotFound(res);
    }

    return;
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/categories', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    // create category
    const categoryObj = mpCategoriesService.pick(req.body);

    //
    // payload validation
    //
    payloadValidatorHandler
      .payload(categoryObj)
      .cantBeNullOrEmpty(mpCategoriesService.requiredProps())
      .cantHaveEmptySpace(['staticId', 'urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let duplicated = await mpCategoriesService.checkUnique(categoryObj);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others categories.[${duplicated.join(',')}]`);
      return;
    }

    categoryObj.createdAt = new Date();
    categoryObj.updatedAt = new Date();

    var newCategory = await mpCategoriesService.create(categoryObj);

    responseHandler.resultNew(res, newCategory);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/mp/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const categoryId = req.params.categoryId;
    const categoryObj = mpCategoriesService.pick(req.body);

    //
    // payload validation
    //
    payloadValidatorHandler
      .payload(categoryObj)
      .cantBeNullOrEmpty(mpCategoriesService.requiredProps())
      .cantHaveEmptySpace(['staticId', 'urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let duplicated = await mpCategoriesService.checkUnique(req.body, categoryId);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others categories.[${duplicated.join(',')}]`);
      return;
    }

    var updatedCategory = await mpCategoriesService.update(categoryId, categoryObj);

    responseHandler.resultUpdated(res, updatedCategory);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.delete('/mp/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var categoryId = req.params.categoryId;

    if(_.isEmpty(categoryId)){
      responseHandler.errorComposer(res, 'Invalid category id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpCategoriesService.delete(categoryId);

    if(result){
      responseHandler.resultDeleted(res);
    }else{
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

module.exports = router;