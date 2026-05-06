import Observable from '../framework/observable.js';
import { getMockPoints } from '../mock/point-mock.js';

export default class PointsModel extends Observable {
  #points = null;

  constructor() {
    super();
    this.#points = getMockPoints();
  }

  getPoints() {
    return this.#points;
  }

  updatePoint(updatedPoint) {
    const index = this.#points.findIndex((point) => point.id === updatedPoint.id);
    if (index === -1) {
      return;
    }
    this.#points[index] = updatedPoint;
    this._notify('MINOR', updatedPoint);
  }
}
