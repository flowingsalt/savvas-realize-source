angular.module('RealizeApp')
// typeAndSelect: a component made of the typeahead input and list of selections
// @attr popupMatchTmplUrl. Required. Template for typeahead match.
// @attr selectedItemTmplUrl. Required. Template for selected match.
/* myConfig = {
        results: Required. Array of possible matches for typeahead.
        formText: Required. See typeAndSelect.html.
        isAddAllEnabled: Optional. When true, displays checkbox to add all typeahead matches.
        isFormSubmitted: Optional. Triggers type-and-select form submission error.
        customFilter: Optional. Additional filter for typeahead matches.
        preSelectedItems: Optional. A subset of @attr results. Represents items already marked as selected.
        hideRemoveIcon: Optional. A function to determine whether to display "remove" icon for selection.
        customClasses: Optional. See typeAndSelect.html.
   }
*/

// Example:
// <div type-and-select form-submitted="myBool" ... > </div>
    .directive('typeAndSelect', [
        '$log',
        '$timeout',
        'Messages',
        'BrowserInfo',
        function($log, $timeout, Messages, BrowserInfo) {
            'use strict';

            return {
                templateUrl: 'templates/partials/typeAndSelect.html',
                replace: true,
                scope: {
                    config: '=typeAndSelect',
                    popupMatchTmplUrl: '=',
                    selectedItemTmplUrl:'='
                },
                link: function(scope, element, attrs) {
                    scope.Messages = Messages;

                    var defaultIsFormSubmitted = function() {
                        return false;
                    },
                    defaultHideRemoveIcon = defaultIsFormSubmitted,
                        validPopoverPlacements = ['top', 'right', 'bottom', 'left', 'left-top'];

                    scope.results = scope.config.results;
                    scope.formText = scope.config.formText;
                    scope.popoverPlacement = scope.config.popoverPlacement;

                    if (validPopoverPlacements.indexOf(scope.popoverPlacement) === -1) {
                        scope.popoverPlacement = validPopoverPlacements[0];
                    }

                    scope.isAddAllEnabled = scope.config.isAddAllEnabled || false;
                    scope.formSubmitted = scope.config.isFormSubmitted || defaultIsFormSubmitted;
                    scope.customFilter = scope.config.customFilter;
                    scope.preSelectedItems = scope.config.preSelectedItems || [];
                    scope.hideRemoveIcon = scope.config.hideRemoveIcon || defaultHideRemoveIcon;
                    scope.customClasses = scope.config.customClasses || '';
                    scope.config.searchBufferMS = angular.isNumber(scope.config.searchBufferMS) ?
                        parseInt(scope.config.searchBufferMS) : 0;
                    scope.$watch('config', function() {
                        scope.customClasses = scope.config.customClasses || '';
                    }, true);

                    if (scope.$eval(attrs.inModal) && BrowserInfo.OS.isIOS) { //typeahead input in modal fix
                        element.on('focus', '.typeahead.dropdown-menu a', function(event) {
                            if (event && event.target) {
                                event.stopPropagation();
                                angular.element(event.target).click();
                            }
                        });
                    }

                    var selectedAssigneeIndex = 0;

                    var selectAssignee = function(event, assignee) {
                        assignee.selected = true;
                        assignee.addedIndex = selectedAssigneeIndex++;
                        assignee.hideRemoveIcon = scope.hideRemoveIcon;
                        scope.keyword = ''; //clear input

                        scope.$emit('typeAndSelect.itemAdded', assignee);
                    };

                    scope.typeaheadOnSelect = function(event, selectedValue) {
                        if (selectedValue && $.inArray(selectedValue, scope.results) >= 0) {
                            selectAssignee(event, selectedValue);
                        }
                    };

                    var noMatchBufferPromise;
                    scope.$on('typeaheadPopup.noMatches', function() {
                        if (scope.config.searchBufferMS > 0) {
                            if (noMatchBufferPromise) {
                                $timeout.cancel(noMatchBufferPromise);
                            }

                            if (scope.typeaheadFocused &&
                                angular.isDefined(scope.keyword) &&
                                scope.keyword.length > 0) {
                                noMatchBufferPromise = $timeout(function setTypeAndSelectNoMatch() {
                                    scope.noMatch = true;
                                }, scope.config.searchBufferMS);
                            }
                        } else {
                            scope.noMatch = true;
                        }
                    });

                    scope.$on('typeaheadPopup.hasMatches', function hasMatches() {
                        if (noMatchBufferPromise) {
                            $timeout.cancel(noMatchBufferPromise);
                        }

                        scope.noMatch = false;
                    });

                    scope.removeSelection = function(item) {
                        scope.addAllClicked = false;
                        delete item.selected;
                        scope.$emit('typeAndSelect.itemRemoved', item);
                    };

                    scope.availableResult = function(item) {
                        return !item.selected;
                    };

                    scope.getSelectedItems = function() {
                        return _.filter(scope.results, function(item) {
                            return item.selected === true;
                        });
                    };

                    scope.getAvailableItems = function() {
                        return _.filter(scope.results, function(item) {
                            return scope.availableResult(item);
                        });
                    };

                    scope.addAllItems = function() {
                        var availableItems = scope.getAvailableItems();

                        _.each(availableItems, function(item) {
                            item.selected = true;
                        });

                        scope.addAllClicked = true;

                        scope.$digest();
                    };

                    scope.disableInput = function() {
                        return scope.isAddAllEnabled && scope.addAllClicked;
                    };

                    scope.displayAddAllOption = function() {
                        return scope.isAddAllEnabled && !scope.addAllClicked && scope.getAvailableItems().length > 0;
                    };

                    var selectPrePopulatedItems = function() {
                        _.each(scope.preSelectedItems, function(item) {
                            item.preSelected = true;
                            selectAssignee(undefined, item);
                        });
                    };

                    if (angular.isArray(scope.preSelectedItems) && scope.preSelectedItems.length > 0) {
                        selectPrePopulatedItems();
                    } else {
                        scope.$on('typeAndSelect.selectPrePopulatedItems', function(event, preSelectedItems) {
                            if (preSelectedItems !== undefined && preSelectedItems.length > 0) {
                                scope.preSelectedItems = preSelectedItems;
                                selectPrePopulatedItems();
                            }
                        });
                    }
                }
            };
        }
    ]);
