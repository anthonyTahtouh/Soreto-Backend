const express = require('express');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const mpImageService = require('../../services/mpImages');
const multer = require('multer');
const multerConfig = require('../../config/multer');

const router = express.Router();
const upload = multer(multerConfig);

/*
|--------------------------------------------------------------------------
| Upload assets from market place admin
|--------------------------------------------------------------------------
*/

router.post(
  '/mp/assetsUpload', authService.isAuthenticated, authService.isAuthorized, upload.single('image'), async (req, res) => {
    const { file } = req;
    const {assetObjInfo, section, asset }= req.body;

    try {
      const response = await mpImageService.execute(file, assetObjInfo, section, asset);
      responseHandler.result(res,response);
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

module.exports = router;
