const AbstractCrudInterface = require('./CrudInterface');
var db = require('../db_pg');
var dbError = require('../common/dbError');
class MpCategorySort extends AbstractCrudInterface {
  constructor() {
    super('reverb.mp_category_js');
  }

  async categorySort(startIndex, endIndex, field) {
    //if the start index and the end index are the same, do nothing
    if (startIndex === endIndex) {
      return;
    }

    const returnCategoriesFromRange = async (startIdx, endIdx) => {
      let positionToChange = await db('mp_category_js')
        .returning('*')
        .whereBetween(field, [startIdx, endIdx])
        .orderBy(field, 'asc');
      return positionToChange;
    };

    try {
      //check if end index is higher than start index
      const endIndexBiggerThanstartIndex = endIndex > startIndex;

      let categoriesToBeRanked;
      if (endIndexBiggerThanstartIndex) {
        categoriesToBeRanked = await returnCategoriesFromRange(
          startIndex,
          endIndex
        );

        // Change the index of the element that was dragged
        const movedElement = categoriesToBeRanked[0];

        if (field === 'showHeaderMenuIndex') {
          movedElement.showHeaderMenuIndex = endIndex;
        }
        if (field === 'showTabPanelMenuIndex') {
          movedElement.showTabPanelMenuIndex = endIndex;
        }
        if (field === 'showCategoryMenuIndex') {
          movedElement.showCategoryMenuIndex = endIndex;
        }
        if (field === 'showFooterMenuIndex') {
          movedElement.showFooterMenuIndex = endIndex;
        }
        //movedElement.showHeaderMenuIndex = endIndex; // dinamic column
        await this.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of categoriesToBeRanked) {
          if (element._id !== movedElement._id) {
            if (field === 'showHeaderMenuIndex') {
              element.showHeaderMenuIndex -= 1;
            }
            if (field === 'showTabPanelMenuIndex') {
              element.showTabPanelMenuIndex -= 1;
            }
            if (field === 'showCategoryMenuIndex') {
              element.showCategoryMenuIndex -= 1;
            }
            if (field === 'showFooterMenuIndex') {
              element.showFooterMenuIndex -= 1;
            }
            //element.showHeaderMenuIndex -= 1; // dinamic column
            await this.update(element._id, element);
          }
        }
      } else {
        categoriesToBeRanked = await returnCategoriesFromRange(
          endIndex,
          startIndex
        );

        // Change the index of the element that was dragged
        const movedElement =
          categoriesToBeRanked[categoriesToBeRanked.length - 1];

        if (field === 'showHeaderMenuIndex') {
          movedElement.showHeaderMenuIndex = endIndex;
        }
        if (field === 'showTabPanelMenuIndex') {
          movedElement.showTabPanelMenuIndex = endIndex;
        }
        if (field === 'showCategoryMenuIndex') {
          movedElement.showCategoryMenuIndex = endIndex;
        }
        if (field === 'showFooterMenuIndex') {
          movedElement.showFooterMenuIndex = endIndex;
        }
        //movedElement.showHeaderMenuIndex = endIndex; // dinamic column
        await this.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of categoriesToBeRanked) {
          if (element._id !== movedElement._id) {
            if (field === 'showHeaderMenuIndex') {
              element.showHeaderMenuIndex += 1;
            }
            if (field === 'showTabPanelMenuIndex') {
              element.showTabPanelMenuIndex += 1;
            }
            if (field === 'showCategoryMenuIndex') {
              element.showCategoryMenuIndex += 1;
            }
            if (field === 'showFooterMenuIndex') {
              element.showFooterMenuIndex += 1;
            }
            //element.showHeaderMenuIndex -= 1; // dinamic column
            await this.update(element._id, element);
          }
        }
      }
      return categoriesToBeRanked;
    } catch (error) {
      throw dbError(error, `Error to rank categories`);
    }
  }
}

const mpCategories = new MpCategorySort();
module.exports = mpCategories;