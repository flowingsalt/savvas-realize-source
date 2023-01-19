angular.module('RealizeDirectives')
    // Usage: <ul dropdown-add-item menu-location="" parent-id="" previous-item-id="" ></ul>
    .directive('dropdownAddItem', [
        '$log',
        'TEMPLATE_PATH',
        'Messages',
        function($log, templatePath, Messages) {
            'use strict';

            return {
                scope: {
                    position: '=',
                    isdropup: '='
                },
                templateUrl: 'templates/partials/lessonAddItem.html',
                replace: true,
                link: function(scope) {
                    scope.getMessage = Messages.getMessage;
                    function setDirection() {
                        scope.menuDirection = scope.isdropup ? 'up' : 'down';
                    }

                    scope.$watch('isdropup', setDirection);
                }
            };
        }
    ])

    // adds standard keybaord interaction to dropdowns
    // @attr dd-a11y-toggle-only. Optional. When true, only open/close dropdown behavior is applied.

    // Usage:
    //  <a href="javascript://" class="dropdown-toggle" data-toggle="dropdown" role="button" dropdown-a11y>
    //      {dropdown menu label}
    //      <i class="icon-caret-down"></i>
    //  </a>
    //  <ul class="dropdown-menu" role="menu">
    //      <li role="presentation">
    //          <a ng-click="{action}" href="javascript://" tabindex="-1">{action label}</a>
    //      </li>
    //      ...
    //  </ul>
    // As seen in Realize.ui.dropdownA11y
    .directive('dropdownA11y', [
        '$log',
        'KEY_CODES',
        '$timeout',
        'BrowserInfo',
        function($log, KEY_CODES, $timeout, BrowserInfo) {
            'use strict';

            return {
                link : function(scope, element, attrs) {

                    var $menu = element.next('[role=menu]'),
                        focusableElements,
                        currentIndex,
                        focusedElement,
                        focusTimer,
                        eventNamespace = '.dropdownA11y',
                        mouseOnElement = false;

                    var hasPressed = function(event) {
                        var i;
                        for (i = 1; i < arguments.length; i++) {
                            if (event.which === arguments[i]) {
                                return true;
                            }
                        }
                        return false;
                    };

                    var isElementOfTypeText = function() {
                        return element.is('input') && element.attr('type') === 'text';
                    };

                    var updateFocus = function(el) {
                        el.focus();
                        focusedElement = el;
                    };

                    var toggleMenu = function() {
                        element.click();
                    };

                    var focusFirstElement = function() {
                        focusableElements = $menu.find(':focusable');
                        updateFocus(focusableElements.first());
                    };

                    var closeMenuAndFocusToggle = function() {
                        toggleMenu();
                        updateFocus(element);
                    };

                    var moveUp = function() {
                        currentIndex = focusableElements.index(element.parent().find(':focus'));
                        var isTopmostSelected = currentIndex === 0;
                        if (!isTopmostSelected) {
                            updateFocus(focusableElements.eq(currentIndex - 1));
                        } else {
                            updateFocus(focusableElements.eq(focusableElements.length - 1));
                        }
                    };

                    var moveDown = function() {
                        currentIndex = focusableElements.index(element.parent().find(':focus'));
                        var isBottommostSelected = currentIndex === (focusableElements.length - 1);
                        if (!isBottommostSelected) {
                            updateFocus(focusableElements.eq(currentIndex + 1));
                        } else {
                            updateFocus(focusableElements.eq(0));
                        }
                    };

                    var makeSelection = function(menuEvent) {
                        var clickFn = focusedElement.attr('ng-click') || focusedElement.parent().attr('ql-click');

                        if (angular.isDefined(clickFn)) {
                            if (BrowserInfo.browser.isMSIE && BrowserInfo.browser.msieVersion <= 9) {
                                menuEvent.preventDefault();
                            }

                            focusedElement.scope().$apply(function() {
                                focusedElement.scope().$eval(clickFn);
                            });
                            updateFocus(element);
                        }
                    };

                    var toggleOnly = scope.$eval(attrs.ddA11yToggleOnly),
                        elementKeydownHandler,
                        androidTouchstartHandler,
                        menuKeydownHandler;

                    elementKeydownHandler = function(menuLabelEvent) {
                        var downArrowKeyPressed = hasPressed(menuLabelEvent, KEY_CODES.DOWN),
                            enterOrSpaceKeyPressed = hasPressed(menuLabelEvent, KEY_CODES.SPACE, KEY_CODES.ENTER);

                        if (enterOrSpaceKeyPressed) {
                            // space is allowed in case of input field. Toggle is not expected in this case.
                            if (!isElementOfTypeText()) {
                                menuLabelEvent.preventDefault();
                                toggleMenu();
                                delayFirstElementFocus(50);
                            }
                        }

                        if (downArrowKeyPressed) {
                            menuLabelEvent.preventDefault();
                            if (!element.parent().hasClass('open')) {
                                toggleMenu();
                            }
                            if (angular.isDefined(scope.loadingTools) && scope.loadingTools) {
                                // in case of lazy load tools items for Tools dropdown
                                scope.$watch('loadingTools', function(value) {
                                    if (!value) {
                                        delayFirstElementFocus();
                                    }
                                });
                            } else {
                                focusFirstElement();
                            }
                        }
                    };

                    function delayFirstElementFocus(delayDuration) {
                        var delayInMilliSeconds = delayDuration || 0;
                        focusTimer = $timeout(function() {
                            focusFirstElement();
                        }, delayInMilliSeconds); // delay allows to find focusable directive to finish
                    }

                    var elementClickHandler = function() {
                        // in the case of NVDA keydown event is fired as click, checking mouseOnElement to
                        // verify and then focus on the first menu item
                        if (!mouseOnElement) {
                            delayFirstElementFocus(50);
                        }
                    };

                    var mouseEventHandler = function() {
                        mouseOnElement = !mouseOnElement;
                    };

                    element.on('mouseenter', mouseEventHandler);

                    element.on('mouseleave', mouseEventHandler);

                    element.on('click', elementClickHandler);

                    element.on('keydown', elementKeydownHandler);

                    $menu.find('a').attr('tabindex', -1);

                    if (BrowserInfo.OS.isAndroid) {
                        androidTouchstartHandler = function(event) {
                            var target = event.target || event.srcElement;
                            updateFocus(target);
                        };
                        $menu.on('touchstart' + eventNamespace, androidTouchstartHandler);
                    }

                    menuKeydownHandler = function(menuEvent) {
                        switch (menuEvent.which) {
                            case KEY_CODES.ESC:
                                menuEvent.preventDefault();
                                menuEvent.stopPropagation();
                                //prevents ESC from closing modal if dropdown was opened from modal
                                closeMenuAndFocusToggle();
                                break;

                            case KEY_CODES.UP:
                                if (toggleOnly) { break; }
                                menuEvent.preventDefault();
                                moveUp();
                                break;

                            case KEY_CODES.DOWN:
                                if (toggleOnly) { break; }
                                menuEvent.preventDefault();
                                moveDown();
                                break;

                            case KEY_CODES.ENTER:
                                if (toggleOnly) { break; }
                                if (angular.isDefined(focusedElement)) {
                                    makeSelection(menuEvent);
                                    $timeout(function() {
                                        return;
                                    }, 0);
                                }

                                toggleMenu();

                                break;
                        }
                    };

                    $menu.on('keydown' + eventNamespace, menuKeydownHandler);

                    scope.$on('$destroy', function() {
                        $menu.off(eventNamespace);
                        if (focusTimer) {
                            $timeout.cancel(focusTimer);
                        }
                    });
                }
            };
        }
    ]);
