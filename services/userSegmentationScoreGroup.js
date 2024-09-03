const AbstractCrudInterface = require('./CrudInterface');

class UserSegmentationScoreGroup extends AbstractCrudInterface {
  constructor() {
    super('reverb.user_segmentation_score_group');
  }

  async deleteByUserSegmentationId(userSegmentationId) {
    const query = this.table().where('user_segmentation_id', userSegmentationId).del();
    return query;
  }
}

let userSegmentationScoreGroup = new UserSegmentationScoreGroup();

module.exports = userSegmentationScoreGroup;
