const express = require('express');
const router = express.Router();
const _ = require('lodash');

const mpBlogsService = require('../../services/mpBlogs');
const mpBrandsService = require('../../services/mpBrands');
const authService = require('../../services/auth');

const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

/*
|--------------------------------------------------------------------------
| Marketplace Blogs API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/blogs', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  const query = req.query;

  try {

    var blogs = await mpBlogsService.getPage({}, query, ['name', 'title']);

    if (blogs && !_.isEmpty(blogs)) {
      responseHandler.result(res, blogs);
    } else {
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/blogs/:blogId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var blogId = req.params.blogId;
    var blog = await mpBlogsService.getById(blogId);
    if (blog) {

      if(blog.brandId){
        let brand = await mpBrandsService.getById(blog.brandId);

        if(brand){
          blog.brand = brand;
        }
      }

      responseHandler.result(res, blog);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/blogs', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const blogObj = mpBlogsService.pick(req.body);

    payloadValidatorHandler
      .payload(blogObj)
      .cantBeNullOrEmpty(mpBlogsService.requiredProps())
      .cantHaveEmptySpace(['urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let duplicated = await mpBlogsService.checkUnique(blogObj);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields are duplicated, possibly the [${duplicated.join(',')}]`);
      return;
    }

    blogObj.createdAt = new Date();
    blogObj.updatedAt = new Date();

    var blog = await mpBlogsService.create(blogObj);

    responseHandler.resultNew(res, blog);

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/mp/blogs/:blogId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  const blogId = req.params.blogId;

  const blogObj = mpBlogsService.pick(req.body);

  blogObj.updatedAt = new Date();

  try {

    let duplicated = await mpBlogsService.checkUnique(blogObj, blogId);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields are duplicated, possibly the [${duplicated.join(',')}]`);
      return;
    }

    var blog = await mpBlogsService.update(blogId, blogObj);

    responseHandler.resultUpdated(res, blog);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.put('/mp/blogs/:blogId/rank', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  const { blogId } = req.params;

  try {

    const { startIndex, endIndex } = req.body;

    const validBlogId = await mpBlogsService.getById(blogId);

    if (!validBlogId) {
      responseHandler.errorComposer(res, 'Invalid blog id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    const blogs = await mpBlogsService.rankBlogs(startIndex, endIndex);

    responseHandler.result(res, blogs);

  } catch(error) {
    responseHandler.errorComposer(res, error);
  }

});

router.delete('/mp/blogs/:blogId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var blogId = req.params.blogId;

    if(_.isEmpty(blogId)) {
      responseHandler.errorComposer(res, 'Invalid blog id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpBlogsService.delete(blogId);

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

module.exports = router;
