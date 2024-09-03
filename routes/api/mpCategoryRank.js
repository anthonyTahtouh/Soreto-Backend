const express = require('express');
const router = express.Router();
const categorySortService = require('../../services/mpCategoriesRank');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');

/*
|--------------------------------------------------------------------------
| Marketplace Category Rank API endpoint
|--------------------------------------------------------------------------
*/

router.put('/mp/categories/:categoryId/rank/:rankId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  const { rankId, categoryId } = req.params;

  try {

    const { startIndex, endIndex } = req.body;

    const validCategoryId = await categorySortService.getById(categoryId);

    if (!validCategoryId) {
      responseHandler.errorComposer(res, 'Invalid category id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    const categories = await categorySortService.categorySort(startIndex, endIndex, rankId);

    responseHandler.result(res, categories);

  } catch(error) {
    responseHandler.errorComposer(res, error);
  }

});

module.exports = router;