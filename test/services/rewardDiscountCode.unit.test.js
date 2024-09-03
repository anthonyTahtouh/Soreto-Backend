require('should');
const mockDb = require('mock-knex');
const db = require('../../db_pg');
const rewardDiscountCodeService = require('../../services/rewardDiscountCode');


describe('Unit Test for reward discount Code service', () => {
  let tracker = mockDb.getTracker();
  beforeEach(() => {
    mockDb.mock(db);
    tracker.install();
  });
  afterEach(() => {
    mockDb.unmock(db);
    tracker.uninstall();
  });

  describe('getById', () => {
    it('should return single element based on id', (done) => {
      tracker.on('query', (query) => {
        query.response({id: 1});
      });
      rewardDiscountCodeService.getById({}, '')
        .then((response) => {
          response.should.have.property('id', 1);
          done();
        });
    });
    it('should reject if error', (done) => {
      const error = new Error('error');
      tracker.on('query', (query) => {
        query.reject(error);
      });
      rewardDiscountCodeService.getById({}, '')
        .catch((response) => {
          response.should.have.property('code', 'ERR_ERROR TO CALL \'GET\' DATA FROM AGG_REWARD_DISCOUNT_CODE_JS_QUERY');
          response.should.have.property('message', 'An unknown error occurred while querying the database.');
          response.should.have.property('statusCode', 500);
          response.should.have.property('data', error);
          done();
        });
    });
  });

  describe('getPage', () => {
    it('should return page and totalCount', (done) => {
      tracker.on('query', (query, step) => {
        [
          () => {
            query.response([{count: 3}]);
          },
          () => {
            query.response([{
              id: 1,
              code:'foo'
            },{
              id: 2,
              code:'foo'
            },{
              id: 3,
              code:'foo'
            }]);
          }
        ][step -1]();
      });
      rewardDiscountCodeService.getPage({}, '')
        .then((response) => {
          response.should.have.property('totalCount', 3);
          response.page.should.deepEqual([{id: 1,code:'foo'},{id: 2,code:'foo'},{id: 3,code:'foo'}]);
          done();
        });
    });

    it('should reject if error while count', (done) => {
      const error = new Error('error');
      tracker.on('query', (query) => {
        query.reject(error);
      });
      rewardDiscountCodeService.getPage({}, '')
        .catch((response) => {
          response.should.have.property('code', 'ERR_AGG_REWARD_DISCOUNT_CODE_JS_QUERY');
          response.should.have.property('message', 'An unknown error occurred while querying the database.');
          response.should.have.property('statusCode', 500);
          response.should.have.property('data', error);
          done();
        });
    });
    it('should reject if error while querying the page', (done) => {
      const error = new Error('error');
      tracker.on('query', (query, step) => {
        [
          () => {
            query.response([{count: 3}]);
          },
          () => {
            query.reject(error);
          }
        ][step -1]();
      });
      rewardDiscountCodeService.getPage({}, '')
        .catch((response) => {
          response.should.have.property('code', 'ERR_AGG_REWARD_DISCOUNT_CODE_JS_QUERY');
          response.should.have.property('message', 'An unknown error occurred while querying the database.');
          response.should.have.property('statusCode', 500);
          response.should.have.property('data', error);
          done();
        });
    });
  });
  describe('getBatchDiscountCodeAndAssignUserId', () => {
    it('should return discount data', (done) => {
      tracker.on('query', (query) => {
        query.response({
          rows: [{ data:{code:'code'}}]
        });
      });
      rewardDiscountCodeService.getBatchDiscountCodeAndAssignUserId('mock', 'refereeRewardId', 'mock')
        .then((response) => {
          response.code.should.equal('code');
          done();
        });
    });

    it('should reject if error while count', (done) => {
      const error = new Error('error');
      tracker.on('query', (query) => {
        query.reject(error);
      });
      rewardDiscountCodeService.getBatchDiscountCodeAndAssignUserId('mock', 'refereeRewardId', 'mock')
        .catch((response) => {
          response.should.have.property('code', 'ERR_ERROR RETRIEVING DISCOUNT CODE_QUERY');
          response.should.have.property('message', 'An unknown error occurred while querying the database.');
          response.should.have.property('statusCode', 500);
          response.should.have.property('data', error);
          done();
        });
    });
  });
});
