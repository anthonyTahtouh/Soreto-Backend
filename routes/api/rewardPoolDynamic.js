const express = require('express');
const router = express.Router();
const _ = require('lodash');
const responseHandler = require('../../common/responseHandler');

// var moment = require('moment');

const rewardPoolDynamicService = require('../../services/rewardPoolDynamic');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | Reward API endpoint
 |--------------------------------------------------------------------------
 */

router.get(
  '/rewardPoolDynamic',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    const query = req.query;
    const clientId = req.query.clientId ? req.query.clientId : null;

    var filter = {};
    if (clientId) {
      filter = { clientId: clientId };
    }

    try {
      var rewardPoolDynamicList = await rewardPoolDynamicService.getPage(
        filter,
        query,
        ['name', 'clientName']
      );

      if (rewardPoolDynamicList && !_.isEmpty(rewardPoolDynamicList)) {
        responseHandler.result(res, rewardPoolDynamicList);
      } else {
        responseHandler.resultNotFound(res);
      }
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

router.delete(
  '/rewardPoolDynamic/:rewardPoolDynamicId',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    const rewardPoolDynamicId = req.params.rewardPoolDynamicId;

    try {
      let deleteRewardPoolDynamic = await rewardPoolDynamicService.delete(
        rewardPoolDynamicId
      );
      responseHandler.result(res, deleteRewardPoolDynamic);
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  });

router.get('/rewardPoolDynamic/:rewardPoolDynamicId', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPoolDynamicId = req.params.rewardPoolDynamicId;

  try {
    const rewardPool = await rewardPoolDynamicService.getById(rewardPoolDynamicId);

    if (rewardPool) {
      responseHandler.result(res, rewardPool);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {

    responseHandler.errorComposer(res, err);
  }
});

router.put('/rewardPoolDynamic/:rewardPoolDynamicId', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPoolDynamicId = req.params.rewardPoolDynamicId;
  const { name } = req.body;

  try {

    const updated = await rewardPoolDynamicService.update(rewardPoolDynamicId, { name });

    if (updated) {
      responseHandler.result(res, updated);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {
    responseHandler.errorComposer(res, err);
  }
});

router.post('/rewardPoolDynamic', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPool = _.pick(req.body, [
    'clientId',
    'name',
  ]);

  try {
    const rewardPoolId = await rewardPoolDynamicService.create(rewardPool);

    if (rewardPoolId) {
      responseHandler.result(res, rewardPoolId);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {
    responseHandler.errorComposer(res, err);
  }
});
router.post('/rewardPoolDynamicItem', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPool = _.pick(req.body, [
    'reward_id',
    'alias',
    'rules',
    'active',
    'visible'
  ]);

  const { type, reward_pool_dynamic_id } = req.body;

  try {
    const rDP = await rewardPoolDynamicService.getByIdWithNoJoin(reward_pool_dynamic_id);
    let rewardGroupItem;

    if (rDP) {
      let rewardGroupId = rDP[type + '_reward_group_id'];

      if (!rewardGroupId) {
        const clientId = rDP.client_id;
        const name = `${rDP.name}${type}_group`;
        rewardGroupId = await rewardPoolDynamicService.createRewardGroup({ clientId, name });
        rDP[type + '_reward_group_id'] = rewardGroupId;
        await rewardPoolDynamicService.update(rDP._id, rDP);
      }

      rewardGroupItem = await rewardPoolDynamicService.createRewardGroupItem({ ...rewardPool, rewardGroupId });
    }
    if (rewardGroupItem) {
      responseHandler.result(res, rewardGroupItem);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {
    responseHandler.errorComposer(res, err);
  }

});

router.put('/rewardPoolDynamicItem/:rewardPoolDynamicItemId', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPoolDynamicItemId = req.params.rewardPoolDynamicItemId;
  const rewardPoolItem = _.pick(req.body, [
    'reward_id',
    'alias',
    'rules',
    'active',
    'visible'
  ]);

  try {

    const rewardGroupItem = await rewardPoolDynamicService.updateRewardGroupItem(rewardPoolItem, rewardPoolDynamicItemId);

    if (rewardGroupItem) {
      responseHandler.result(res, rewardGroupItem);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {
    responseHandler.errorComposer(res, err);
  }
});

router.delete('/rewardPoolDynamicItem/:rewardPoolDynamicItemId', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const rewardPoolDynamicItemId = req.params.rewardPoolDynamicItemId;
  try {

    const deleted = await rewardPoolDynamicService.deleteRewardGroupItem(rewardPoolDynamicItemId);

    if (deleted) {
      responseHandler.result(res, deleted);
    } else {
      responseHandler.resultNotFound(res);
    }
  }
  catch (err) {
    responseHandler.errorComposer(res, err);
  }
});

module.exports = router;
