const AbstractCrudInterface = require('./CrudInterface');

class UserSegmentationScoreGroup extends AbstractCrudInterface {
  constructor() {
    super('reverb.user_segmentation_pool_group');
  }

  async deleteByUserSegmentationPoolId(userSegmentationPoolId) {
    const query = this.table().where('user_segmentation_pool_id', userSegmentationPoolId).del();
    return query;
  }
}

let userSegmentationScoreGroup = new UserSegmentationScoreGroup();

module.exports = userSegmentationScoreGroup;
