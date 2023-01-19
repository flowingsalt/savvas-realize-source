(function() {
    'use strict';

    ItemBoxesDirective.$inject = ['PATH'];
    /**
     * Directive for showing the list of Settings->Standards Items
     * Makes sure the items in each row are the same height
     * @param {{TEMPLATE_ROOT: string}} PATH
     */
    function ItemBoxesDirective(PATH) {
        return {
            bindToController: true,
            controller: 'ItemBoxesController',
            controllerAs: 'itemBoxes',
            link: {
                /**
                 * Post-Link function to ensures directive waits for DOM to be rendered before getting element heights
                 * @param {angular.IScope} scope
                 * @param {angular.IRootElementService} element
                 * @param {angular.IAttributes} attributes
                 * @param {ItemBoxesController} itemBoxes
                 */
                post: function(scope, element, attributes, itemBoxes) {
                    itemBoxes.adjustHeight();
                }
            },
            restrict: 'EA',
            scope: {
                items: '='
            },
            templateUrl: PATH.TEMPLATE_ROOT + '/app/profile/itemBoxes.html'
        };
    }

    ItemBoxesController.$inject = ['$scope', '$element', 'STANDARDS_STATE_INFO'];
    /**
     * Controller for itemBoxes directive
     * @param {angular.IScope} $scope
     * @param {angular.IRootElementService} $element
     * @param {{STATE_INFO_LIMIT: Number}} STANDARDS_STATE_INFO
     * @constructor
     */
    function ItemBoxesController($scope, $element, STANDARDS_STATE_INFO) {
        this.element = $element[0];
        this.scope = $scope;

        this.watchItems();

        ItemBoxesController.STATE_INFO_LIMIT = STANDARDS_STATE_INFO.STATE_INFO_LIMIT;
    }

    /**
     * Processes items passed into directive, then processes them for display, and adjusts element heights
     * NOTE: only runs watcher callback first time items are passed in
     */
    ItemBoxesController.prototype.watchItems = function() {
        var unwatch = this.scope.$watch(function() {
            return this.items;
        }.bind(this), function() {
            this.filteredItems = this.filterItems(this.items);
            this.scope.$applyAsync(this.adjustHeight.bind(this));
            unwatch();
        }.bind(this));
    };

    /**
     * Iterates through items and shortens descriptions
     * @param {Object} items
     * @returns {Object} Filtered Items
     */
    ItemBoxesController.prototype.filterItems = function(items) {
        var filteredItems = {};

        ItemBoxesController.forOwn(items, function(item, key) {
            filteredItems[key] = ItemBoxesController.shortenItems(item);
        }, this);

        return filteredItems;
    };

    /**
     * Shortens each description in the item
     * @param {Array<string>} item Original item
     * @returns {Array<string>} new Array with the shortened descriptions
     */
    ItemBoxesController.shortenItems = function(item) {
        var filteredShortenItems = [];

        item.forEach(function(description) {
            if (description !== null) {
                filteredShortenItems.push(description.substring(0, ItemBoxesController.STATE_INFO_LIMIT));
            }
        });

        return filteredShortenItems;
    };

    /**
     * @returns {Array<HTMLLIElement>} All list items within unordered list
     */
    ItemBoxesController.prototype.getChildren = function() {
        var unorderedList = this.element.children[0];

        return ItemBoxesController.toArray(unorderedList.children);
    };

    /**
     * Iterates of list items and sets their heights
     */
    ItemBoxesController.prototype.adjustHeight = function adjustHeight() {
        var children = this.getChildren(),
            previousItem,
            previousHeight;

        children.forEach(function(item, index) {
            var elementIsEven = ItemBoxesController.isEven(index),
                itemHeight = item.clientHeight;

            if (!elementIsEven) {
                ItemBoxesController.setElementHeights([item, previousItem], [itemHeight, previousHeight]);
            } else {
                previousHeight = itemHeight;
                previousItem = item;
            }
        });
    };

    /**
     * Takes a pair of elements and a pair of heights and sets both elements' minHeights to the larger of the 2 heights
     * @param {Array<HTMLLIElement>} elements
     * @param {Array<number>} heights in px
     */
    ItemBoxesController.setElementHeights = function setElementHeight(elements, heights) {
        var maxHeight = Math.max.apply(Math, heights);

        elements.forEach(function(element) {
            element.style.height = maxHeight + 'px';
        });
    };

    /**
     * Checks whether a number is even
     * @param {Number} number
     * @returns {boolean}
     */
    ItemBoxesController.isEven = function isEven(number) {
        return number % 2 === 0;
    };

    /**
     * Converts an array-like object to an array
     * @param {any} item
     * @returns {Array<any>}
     */
    ItemBoxesController.toArray = function(item) {
        if (Array.from) {
            return Array.from(item);
        }

        return Array.prototype.slice.call(item);
    };

    /**
     * Iterates over an object
     * @param {any} object Object to iterate over
     * @param {function(value, key):void} callback
     * @param {Object} thisArg What to use as `this` in the callback
     */
    ItemBoxesController.forOwn = function(object, callback, thisArg) {
        Object
            .keys(object)
            .forEach(function(key) {
                var value = object[key];

                if (thisArg) {
                    return callback.call(thisArg, value, key);
                }

                return callback(value, key);
            });
    };

    angular.module('Realize.profile.itemBoxes', [])
        .constant('STANDARDS_STATE_INFO', {
            'STATE_INFO_LIMIT': 50
        })
        .controller('ItemBoxesController', ItemBoxesController)
        .directive('itemBoxes', ItemBoxesDirective);
}());
