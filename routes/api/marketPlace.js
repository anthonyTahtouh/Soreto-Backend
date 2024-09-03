const express = require('express');
const authService = require('../../services/auth');
const marketPlaceService = require('../../services/marketPlace');

const router = express.Router();
/*
 |--------------------------------------------------------------------------
 | Layout API endpoint
 |--------------------------------------------------------------------------
 */

/**
  * Vanish Market Place vanish collections
  */
router.post('/mp/vanish_collections', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try{

    await marketPlaceService.vanishCollections();

    res.status(200).send();
  }catch(error){
    res.status(500).send(error);
  }
});

/**
  * Vanish Market Place fill collections
  */
router.post('/mp/fill_collections', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    marketPlaceService.fillCollections();

    res.status(200).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

/**
  * Vanish Market Place refresh
  */
router.post('/mp/refresh', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    await marketPlaceService.vanishCollections();
    marketPlaceService.fillCollections();

    res.status(200).send();
  } catch (error) {
    res.status(500).send(error);
  }

});

module.exports = router;