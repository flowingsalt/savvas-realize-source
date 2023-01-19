angular.module('Realize.dragAndDrop.directives', [])
    // @attr dragDropList. Required. (Object) specifies the list of items to drag and drop
    // @attr dragDropSelector. Required. (Selector) specifies the selector of the elements to drag and drop
    // @attr dragDropOptions. (Object) specify additional options
    //       dragDropOptions.enabled. (Boolean) Default true. If false, the list will not receive keyboard focus
    //       dragDropOptions.keyCode. Optional. (Number) specifies a keycode that maps to an action
    //       dragDropOptions.keyAction. Optional. (Function) action mapped to the specified keyCode
    //       dragDropOptions.thumbnailModeFix. Optional (Boolean) if we want thumbnail view reordering,
    //           set this to true to fix display glitch during drag&drop
    //       dragDropOptions.placeholderClass. Required for thumbnail view reordering.
    //           (String) specify class of the placeholder (jquery-ui sortable option)
    // Usage:
    // <ul drag-drop-list="{{myList}}" drag-drop-selector="{{mySelector}}" drag-drop-options="{{dragDropOptions}}">
    //      <li class="{{mySelector}}"> </li>
    // </ul>

    .directive('dragDropList', [
        '$log',
        '$rootScope',
        'KEY_CODES',
        'Messages',
        function($log, $rootScope, KEY_CODES, Messages) {
            'use strict';

            return {
                link: function(scope, element, attrs) {
                    var currentDragDropList,
                        initKeyboardMode;

                    var options = scope.$eval(attrs.uiSortable);

                    // watch ng-model so we always know what element is at a specific position
                    scope.$watch(attrs.ngModel, function(newDragDropList) {
                        currentDragDropList = newDragDropList;
                    }, true);

                    scope.moveItemInList = function(startIndex, newIndex) {
                        var itemToMove = currentDragDropList[startIndex];
                        // remove item from startIndex
                        currentDragDropList.splice(startIndex, 1);
                        // insert item at newIndex
                        currentDragDropList.splice(newIndex, 0, itemToMove);
                        // update the view
                        scope.$apply(scope.model);
                    };

                    scope.dragDropEnabled = options && angular.isDefined(options.enabled) ? options.enabled : true;

                    if (scope.dragDropEnabled) {
                        // treat the sort widget as one focusable item and set a handler
                        $(element).attr('tabindex', 0).attr('role', 'listbox').focusin(function() {
                            $log.log('$rootScope.isKeyboardInUse: ' + $rootScope.isKeyboardInUse);
                            if ($rootScope.isKeyboardInUse) {
                                initKeyboardMode();
                            }
                        });
                    } else {
                        $(element).removeAttr('tabindex');
                    }

                    initKeyboardMode = function() {
                        $log.log('== init keyboardMode');

                        // remove any links from normal keyboard tabbing
                        $(element).find('a').attr('tabindex', -1);

                        $(element)
                             .attr('aria-dropeffect', 'none')
                             .attr('aria-grabbed', 'false');

                        // init a DOM reference
                        var $sortableArray = $(element).children(attrs.dragDropSelector);

                        var getCurrentFocusIndex = function() {
                            var index;
                            angular.forEach(scope.KBdragDropList.items, function(item, i) {
                                if (item.hasFocus) { index = i; }
                            });
                            return index;
                        };

                        var getCurrentSelectedIndex = function() {
                            var index;
                            angular.forEach(scope.KBdragDropList.items, function(item, i) {
                                if (item.isSelected) { index = i; }
                            });
                            return index;
                        };

                        var scrollToFocused = function(index) {
                            var focusedElementOffsetTop = angular.element($sortableArray[index]).offset().top,
                            focusedElementHeight = angular.element($sortableArray[index]).outerHeight(true),
                            viewportHeight = angular.element(window).height(),
                            scrollValue = (focusedElementOffsetTop + focusedElementHeight) - viewportHeight;

                            // Scroll page when changing focus on sortable items,
                            //     to put focussed element in view port area
                            if (scrollValue > 0) {
                                angular.element(document).scrollTop(scrollValue);
                            }
                        };

                        var setFocusByIndex = function(index) {
                            angular.forEach(scope.KBdragDropList.items, function(item, i) {
                                item.hasFocus = index === i;
                            });

                            // clear and re-apply visible selector
                            $sortableArray.removeClass('keyboardFocus keyboardSelected');
                            $.each($sortableArray, function(i) {
                                $(this).toggleClass('keyboardFocus', index === i);
                                var currIndex = index + 1;
                                $(element).attr(
                                    'aria-label',
                                    [
                                        Messages.getMessage('editProgram.offscreen.dragAndDrop.position'),
                                        currIndex,
                                        currentDragDropList[index].$getTitle()
                                    ].join(' ')
                                );
                            });

                            scrollToFocused(index);
                        };

                        var setSelectedByIndex = function(index) {
                            angular.forEach(scope.KBdragDropList.items, function(item, i) {
                                item.isSelected = index === i;
                            });

                            // clear and re-apply visible selector
                            $sortableArray.removeClass('keyboardFocus keyboardSelected');
                            $.each($sortableArray, function(i) {
                                $(this).toggleClass('keyboardSelected', index === i);
                                $(element)
                                    .attr('aria-grabbed', 'true')
                                    .attr('aria-dropeffect', 'move');
                            });
                        };

                        var toggleSelected = function(index) {
                            scope.KBdragDropList.selectionMode = !scope.KBdragDropList.selectionMode;
                            if (getCurrentSelectedIndex() === index) {
                                scope.KBdragDropList.items[index].isSelected = false;
                                $(element)
                                    .attr('aria-grabbed', 'false')
                                    .attr('aria-dropeffect', 'none');
                                setFocusByIndex(index);
                            } else {
                                setSelectedByIndex(index);
                            }
                        };

                        var focusNext = function(currentIndex) {
                            if (currentIndex < scope.KBdragDropList.items.length - 1) {
                                setFocusByIndex(currentIndex + 1);
                            }
                        };

                        var focusPrev = function(currentIndex) {
                            if (currentIndex > 0) {
                                setFocusByIndex(currentIndex - 1);
                            }
                        };

                        var moveNext = function(selectedIndex) {
                            if (selectedIndex < scope.KBdragDropList.items.length - 1) {
                                // model
                                scope.moveItemInList(selectedIndex, selectedIndex + 1);
                                // new dom ref
                                $sortableArray = $(element).children(attrs.dragDropSelector);
                                // state obj
                                setFocusByIndex(selectedIndex + 1);
                                setSelectedByIndex(selectedIndex + 1);
                            }
                        };

                        var movePrev = function(selectedIndex) {
                            if (selectedIndex > 0) {
                                // model
                                scope.moveItemInList(selectedIndex, selectedIndex - 1);
                                // new dom ref
                                $sortableArray = $(element).children(attrs.dragDropSelector);
                                // state obj
                                setFocusByIndex(selectedIndex - 1);
                                setSelectedByIndex(selectedIndex - 1);
                            }
                        };

                        if (angular.isUndefined(scope.KBdragDropList)) {
                            scope.KBdragDropList = {};
                            scope.KBdragDropList.items = [];
                            scope.KBdragDropList.selectionMode = false;

                            angular.forEach(currentDragDropList, function() {
                                var itemState = {};

                                itemState.hasFocus = false;
                                itemState.isSelected = false;

                                this.push(itemState);

                            }, scope.KBdragDropList.items);

                            setFocusByIndex(0);

                        } else {
                            // restore previous
                            if (scope.KBdragDropList.selectionMode === true) {
                                setSelectedByIndex(getCurrentSelectedIndex());
                            } else {
                                setFocusByIndex(getCurrentFocusIndex());
                            }
                        }

                        // register key handlers
                        $(element).keydown(function(dragdropKeyEvent) {
                            // up arrow
                            if (dragdropKeyEvent.which === KEY_CODES.UP) {
                                dragdropKeyEvent.preventDefault();

                                if (scope.KBdragDropList.selectionMode) {
                                    movePrev(getCurrentSelectedIndex());
                                } else {
                                    focusPrev(getCurrentFocusIndex());
                                }
                            }

                            // down arrow
                            if (dragdropKeyEvent.which === KEY_CODES.DOWN) {
                                dragdropKeyEvent.preventDefault();

                                if (scope.KBdragDropList.selectionMode) {
                                    moveNext(getCurrentSelectedIndex());
                                } else {
                                    focusNext(getCurrentFocusIndex());
                                }
                            }

                            // spacebar or enter
                            if (dragdropKeyEvent.which === KEY_CODES.SPACE ||
                                dragdropKeyEvent.which === KEY_CODES.ENTER) {
                                dragdropKeyEvent.preventDefault();

                                toggleSelected(getCurrentFocusIndex());
                            }

                            if (dragdropKeyEvent.which === options.keyCode) {
                                dragdropKeyEvent.preventDefault();

                                var keyAction = options.keyAction;
                                keyAction(getCurrentFocusIndex());

                                scope.$apply(scope.model);
                            }

                            $(this).focusout(function() {
                                $log.log('== keyboardMode focusout()');

                                $(this).unbind(dragdropKeyEvent);

                                $(element)
                                    .removeAttr('aria-grabbed')
                                    .removeAttr('aria-dropeffect');

                                // remove focus styles from items
                                $sortableArray.removeClass('keyboardFocus keyboardSelected');
                            });
                        });
                    };
                }
            };
        }
    ]);
