require('should');
const request = require('supertest');
const sinon = require('sinon');
const app = require('../../app');
const rewardDiscountCodeService = require('../../services/rewardDiscountCode');
const authMock = require('../../mocks/authMock');




describe('API RewardiscountCode unit test', () => {
  const agent = request.agent(app);
  const prefix = '/api/v1';
  let auth;

  beforeEach(() => {
    auth = authMock();
  });

  afterEach(() => {
    auth.restore();
  });

  describe('Testing /rewardDiscountCode', () => {
    let get;
    let create;
    beforeEach(() => {
      get = sinon.stub(rewardDiscountCodeService, 'get');
      create = sinon.stub(rewardDiscountCodeService, 'create');
    });

    afterEach(() => {
      get.restore();
      create.restore();
    });
    it('should response the GET method', (done) => {
      const list = ['mock', 'list'];
      get.resolves(list);
      agent.get(`${prefix}/rewardDiscountCode`).end((err, response) => {
        response.should.have.property('statusCode', 200);
        response.body.should.deepEqual(list);
        done();
      });

    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      get.rejects(error);
      agent.get(`${prefix}/rewardDiscountCode`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });

        done();
      });
    });
    it('should response the PUT method', (done) => {
      const list = ['mock', 'list'];
      create.resolves(list);
      agent.post(`${prefix}/rewardDiscountCode`).end((err, response) => {
        response.should.have.property('statusCode', 201);
        response.body.should.deepEqual(list);
        done();
      });
    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      create.rejects(error);
      agent.post(`${prefix}/rewardDiscountCode`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });
        done();
      });
    });
  });

  describe('Testing /rewardDiscountCode/page', () => {
    let getPage;
    beforeEach(() => {
      getPage = sinon.stub(rewardDiscountCodeService, 'getPage');
    });

    afterEach(() => {
      getPage.restore();
    });
    it('should response the GET method', (done) => {
      const list = ['mock', 'list'];
      getPage.resolves(list);
      agent.get(`${prefix}/rewardDiscountCode/page`).end((err, response) => {
        response.should.have.property('statusCode', 200);
        response.body.should.deepEqual(list);
        done();
      });

    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      getPage.rejects(error);
      agent.get(`${prefix}/rewardDiscountCode/page`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });
        done();
      });
    });
  });
  describe('Testing /rewardDiscountCode/:rewardDiscountCodeId', () => {
    let getById;
    let update;
    beforeEach(() => {
      getById = sinon.stub(rewardDiscountCodeService, 'getById');
      update = sinon.stub(rewardDiscountCodeService, 'update');
    });

    afterEach(() => {
      getById.restore();
      update.restore();
    });
    it('should response the GET method', (done) => {
      const list = ['mock', 'list'];
      getById.resolves(list);
      agent.get(`${prefix}/rewardDiscountCode/1`).end((err, response) => {
        response.should.have.property('statusCode', 200);
        response.body.should.deepEqual(list);
        done();
      });

    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      getById.rejects(error);
      agent.get(`${prefix}/rewardDiscountCode/1`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });
        done();
      });
    });

    it('should response the PUT method', (done) => {
      const list = ['mock', 'list'];
      update.resolves(list);
      agent.put(`${prefix}/rewardDiscountCode/1`).end((err, response) => {
        response.should.have.property('statusCode', 200);
        response.body.should.deepEqual(list);
        done();
      });
    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      update.rejects(error);
      agent.put(`${prefix}/rewardDiscountCode/1`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });
        done();
      });
    });
  });
  describe('Testing /rewardDiscountCode/:campaignVersionId/:rewardType/:userId', () => {
    let getBatchDiscountCodeAndAssignUserId;
    beforeEach(() => {
      getBatchDiscountCodeAndAssignUserId = sinon.stub(rewardDiscountCodeService, 'getBatchDiscountCodeAndAssignUserId');
    });

    afterEach(() => {
      getBatchDiscountCodeAndAssignUserId.restore();
    });
    it('should response the GET method for referee reward Type', (done) => {
      const list = ['mock', 'list'];
      getBatchDiscountCodeAndAssignUserId.resolves(list);
      agent.get(`${prefix}/rewardDiscountCode/1/referee/1`).end((err, response) => {
        response.should.have.property('statusCode', 200);
        response.body.should.deepEqual(list);
        done();
      });

    });
    it('should response the GET method for other reward Type', (done) => {
      const error = {
        code: 'ERR_CLIENTUSER_PARAMS',
        message: 'Invalid discount code params',
        data: {},
      };
      agent.get(`${prefix}/rewardDiscountCode/1/other/1`).end((err, response) => {
        response.should.have.property('statusCode', 400);
        response.body.should.deepEqual(error);
        done();
      });

    });
    it('should response with error if service promise rejects', (done) => {
      const error = new Error('error');
      error.statusCode = 500;
      error.code = 500;
      getBatchDiscountCodeAndAssignUserId.rejects(error);
      agent.get(`${prefix}/rewardDiscountCode/1/referee/1`).end((err, response) => {
        response.should.have.property('statusCode', 500);
        response.body.should.deepEqual({
          code: 500,
          message: 'error',
          data: {},
        });
        done();
      });
    });
  });

});