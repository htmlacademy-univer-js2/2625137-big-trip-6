import { render, RenderPosition } from '../framework/render.js';
import FilterView from '../view/filter-view.js';
import SortView from '../view/sort-view.js';
import ListMessageView from '../view/list-message-view.js';
import FilterModel from '../model/filter-model.js';
import PointPresenter from './point-presenter.js';
import { FiltersPoint, filter } from '../utils/filter-utils.js';

export default class TripPresenter {
  #filterContainer = null;
  #tripEventsContainer = null;
  #destinationsModel = null;
  #offersModel = null;
  #pointsModel = null;
  #filterModel = null;
  #pointPresenters = new Map();
  #currentSort = 'day';
  #filterComponent = null;
  #sortComponent = null;
  #eventsList = null;

  constructor(destinationsModel, offersModel, pointsModel) {
    this.#filterContainer = document.querySelector('.trip-controls__filters');
    this.#tripEventsContainer = document.querySelector('.trip-events');
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#pointsModel = pointsModel;
    this.#filterModel = new FilterModel();
  }

  _getFullPoints() {
    const points = this.#pointsModel.getPoints();
    return points.map((point) => {
      const destination = this.#destinationsModel.getDestinationById(point.destination);
      const allOffersForType = this.#offersModel.getOffersByType(point.type);
      const selectedOffers = allOffersForType.filter((offer) =>
        point.offers.includes(offer.id)
      );
      return {
        ...point,
        destination: destination,
        offers: selectedOffers,
      };
    });
  }

  _getFilteredPoints() {
    const fullPoints = this._getFullPoints();
    const currentFilter = this.#filterModel.filter;
    return filter[currentFilter](fullPoints);
  }

  _getSortedPoints(points) {
    const sortedPoints = [...points];
    switch (this.#currentSort) {
      case 'time':
        sortedPoints.sort((a, b) => {
          const durationA = new Date(b.dateTo) - new Date(b.dateFrom);
          const durationB = new Date(a.dateTo) - new Date(a.dateFrom);
          return durationA - durationB;
        });
        break;
      case 'price':
        sortedPoints.sort((a, b) => b.basePrice - a.basePrice);
        break;
      default:
        sortedPoints.sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
    }
    return sortedPoints;
  }

  _clearEventsList() {
    if (this.#eventsList) {
      this.#eventsList.remove();
      this.#eventsList = null;
    }
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();
  }

  _clearSortComponent() {
    if (this.#sortComponent) {
      this.#sortComponent.element.remove();
      this.#sortComponent = null;
    }
  }

  _renderEmptyMessage() {
    this.#eventsList = document.createElement('ul');
    this.#eventsList.classList.add('trip-events__list');
    this.#tripEventsContainer.appendChild(this.#eventsList);
    const messageView = new ListMessageView({ message: 'Click New Event to create your first point' });
    render(messageView, this.#eventsList);
  }

  _renderSort() {
    this.#sortComponent = new SortView(this.#currentSort, (sortType) => {
      if (this.#currentSort === sortType) {
        return;
      }
      this.#currentSort = sortType;
      this._renderBoard();
    });
    render(this.#sortComponent, this.#tripEventsContainer, RenderPosition.AFTERBEGIN);
    this.#sortComponent._restoreHandlers();
  }

  _renderPoint(point) {
    const pointPresenter = new PointPresenter(
      this.#eventsList,
      this.#handlePointChange.bind(this),
      this.#handleModeChange.bind(this),
      this.#destinationsModel,
      this.#offersModel
    );
    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #handlePointChange(updatedPoint) {
    const rawPoint = {
      id: updatedPoint.id,
      type: updatedPoint.type,
      basePrice: updatedPoint.basePrice,
      dateFrom: updatedPoint.dateFrom,
      dateTo: updatedPoint.dateTo,
      destination: typeof updatedPoint.destination === 'object' ? updatedPoint.destination.id : updatedPoint.destination,
      offers: updatedPoint.offers.map((offer) => typeof offer === 'object' ? offer.id : offer),
      isFavorite: updatedPoint.isFavorite
    };
    this.#pointsModel.updatePoint(rawPoint);
    const presenter = this.#pointPresenters.get(updatedPoint.id);
    if (presenter) {
      const fullPoint = this._getFullPoints().find((p) => p.id === updatedPoint.id);
      presenter.update(fullPoint);
    }
  }

  #handleModeChange() {
    this.#pointPresenters.forEach((presenter) => presenter.resetView());
  }

  _renderBoard() {
    this._clearEventsList();
    this._clearSortComponent();

    const filteredPoints = this._getFilteredPoints();
    const sortedPoints = this._getSortedPoints(filteredPoints);

    if (sortedPoints.length === 0) {
      this._renderEmptyMessage();
      return;
    }

    this._renderSort();

    this.#eventsList = document.createElement('ul');
    this.#eventsList.classList.add('trip-events__list');
    this.#tripEventsContainer.appendChild(this.#eventsList);

    for (const point of sortedPoints) {
      this._renderPoint(point);
    }
  }

  _renderFilters() {
    const filters = Object.values(FiltersPoint);
    const currentFilter = this.#filterModel.filter;
    this.#filterComponent = new FilterView(filters, currentFilter, (filterType) => {
      if (this.#currentSort !== 'day') {
        this.#currentSort = 'day';
      }
      this.#filterModel.setFilter('MAJOR', filterType);
      this._renderBoard();
    });
    render(this.#filterComponent, this.#filterContainer);
    this.#filterComponent._restoreHandlers();
  }

  init() {
    this._renderFilters();
    this._renderBoard();
  }
}
