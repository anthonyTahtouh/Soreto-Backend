const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var msClientFanout = require('../common/senecaClientFanout');

const constants = require('../config/constants');
class mpBlogs extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_blog_js');
  }

  async checkUnique(obj, id){
    return await super.checkUnique(obj, this.uniqueProps(), id);
  }

  pick(obj) {
    return _.pick(obj,[
      'name',
      'title',
      'active',
      'publishedDate',
      'cardImageUrl',
      'urlId',
      'coverTitle',
      'coverDescription',
      'coverImageUrl',
      'bodySourceUrl',
      'brandId',
      'description',
      'bodyContent',
      'trendingIndex',
      'meta',
      'designContent',
      'invisible',
      'flashCampaignIds',
    ]);
  }

  requiredProps() {
    return [
      'name',
      'title',
      'cardImageUrl',
      'urlId',
      'coverTitle',
      'coverDescription',
      'coverImageUrl',
      'description',
    ];
  }

  uniqueProps() {
    return [
      ['urlId'],
      ['trendingIndex'],
    ];
  }

  async getPage(filter, query, searchBy = null) {

    try {
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObj = db('reverb.agg_mp_blog_js');
      const dbObjCount = dbObj.count('*').where(filter);
      let count =  await dbQuery(dbObjCount,queryForCount, searchBy);
      let page = db('reverb.agg_mp_blog_js').returning('*');
      page = await dbQuery(page, query, searchBy);

      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }

  async rankBlogs(startIndex, endIndex) {
    //if the start index and the end index are the same, do nothing
    if (startIndex === endIndex) {
      return;
    }

    const returnBlogsFromRange = async (startIdx, endIdx) => {
      let positionToChange = await db('mp_blog_js')
        .returning('*')
        .whereBetween('trendingIndex', [startIdx, endIdx])
        .orderBy('trendingIndex', 'asc');
      return positionToChange;
    };

    try {
      //check if end index is higher than start index
      const endIndexBiggerThanstartIndex = endIndex > startIndex;

      let blogsToBeRanked;
      if (endIndexBiggerThanstartIndex) {
        blogsToBeRanked = await returnBlogsFromRange(startIndex, endIndex);

        // Change the index of the element that was dragged
        const movedElement = blogsToBeRanked[0];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of blogsToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex -= 1;
            await super.update(element._id, element);
          }
        }
      } else {
        blogsToBeRanked = await returnBlogsFromRange(endIndex, startIndex);

        // Change the index of the element that was dragged
        const movedElement = blogsToBeRanked[blogsToBeRanked.length - 1];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of blogsToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex += 1;
            await super.update(element._id, element);
          }
        }
      }

      // emmiting blog change event
      for(let blog of blogsToBeRanked){
        // notify entity change
        msClientFanout.client.act(constants.EVENTS.ENTITY_CHANGE, { entity: 'reverb.mp_blog_js', record: blog });
      }

      return blogsToBeRanked;
    } catch (error) {
      throw dbError(error, `Error to rank blogs`);
    }
  }
}

const mpBlogsService =  new mpBlogs();

msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_BLOG).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
  try {
    if (data && (data.entity === 'reverb.mp_brand_js' && !data.record.active)) {
      let blogs = await db('reverb.mp_blog_js').select('*').where({brandId: data.record._id});
      for await (const blog of blogs) {
        if (blog && blog.active) {
          blog.active = false;

          await mpBlogsService.update(blog._id, blog);
        }
      }
    }

    return respond(null, { success: true });
  } catch (error) {
    return respond(error, {success: false });
  }
});

module.exports = mpBlogsService;