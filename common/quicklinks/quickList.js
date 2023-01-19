angular.module('Realize.quicklinks.quickList', [])
    .directive('quickList', [
        '$log',
        '$parse',
        '$compile',
        '$timeout',
        '$rootScope',
        function($log, $parse, $compile, $timeout, $rootScope) {
            'use strict';

            return {
                restrict: 'AE',
                template: '<ul class="quicklinks" ng-transclude></ul>',
                replace: true,
                transclude: true,
                scope: true,
                controller: ['$scope', '$element', function($scope, $element) {
                    var ctrl = this;

                    ctrl.$visibleChildCount = 0;

                    ctrl.$calcVisibleChildren = function() {
                        ctrl.$visibleChildCount = 0;
                        angular.forEach($element.children('.quick-link'), function(li) {
                            var link = angular.element(li),
                                childScope = link.scope();

                            if (childScope.hidden === false) {
                                ctrl.$visibleChildCount++;
                            }
                        });
                    };
                }],

                link: function(scope, el, attrs, ctrl) {
                    scope.menuDirection = scope.$eval(attrs.isdropup) ? 'dropup' : 'dropdown';

                    var e2eId = angular.isDefined(attrs.e2eId) ? ' data-e2e-id="' + attrs.e2eId + '"' : '',
                        ngShow = angular.isDefined(attrs.ngShow) ? ' ng-show="' + attrs.ngShow +  '"' : '',
                        ngHide = angular.isDefined(attrs.ngHide) ? ' ng-hide="' + attrs.ngHide +  '"' : '',
                        ngIf = angular.isDefined(attrs.ngIf) ? ' ng-if="' + attrs.ngIf +  '"' : '',
                        quicklinkTemplate = [
                        '<ul class="quick-list-dropdown quicklinks"' + ngShow + ngHide + ngIf + '>',
                            '<li dropdown ' + ' class="quick-list-dropdown-trigger {{ menuDirection }}"' +
                            e2eId + '>',
                                '<a href="javascript://" class="dropdown-toggle" role="button">',
                                    '<i class="icon-', attrs.collapsedIcon, '"></i>',
                                    attrs.collapsedLabel,
                                    '<i class="{{ caretDirection }}"></i>',
                                '</a>',
                                // quicklinks get injected here...
                            '</li>',
                        '</ul>'].join(''),
                        mixedQuicklinkTemplate = [
                        '<li class="nested-quicklinks">',
                            '<ul class="quick-list-dropdown quicklinks"' + ngShow + ngHide + ngIf + '>',
                                '<li dropdown ' +
                                ' class="quick-list-dropdown-trigger {{ menuDirection }}"' + e2eId + '>',
                                    '<a href="javascript://" class="dropdown-toggle" role="button">',
                                        '<i class="icon-', attrs.collapsedIcon, '"></i>',
                                        attrs.collapsedLabel,
                                        '<i class="{{ caretDirection }}"></i>',
                                    '</a>',
                                    // quicklinks get injected here...
                                    '<ul class="dropdown-menu"></ul>',
                                '</li>',
                            '</ul>',
                        '</li>'].join(''),
                        collapsed = false,
                        parent = el.parent().closest('ul'),
                        dependencyWatch = scope.$eval(attrs.dependencyWatch),
                        quicklinkTimer,
                        mixedModeTimer,
                        timeoutOffset = dependencyWatch ? 50 : 0;

                    if (angular.isDefined(attrs.isMixedMode) && scope.tocView !== 'thumbnail') {
                        //TODO: once we have stable isMixedMode or without its dependency, scope.tocView will be removed
                        mixedModeTimer = $timeout(doMixed, timeoutOffset);
                        scope.$on('window.breakpoint.change', function() {
                            if (collapsed) {
                                doExpandFromMixed();
                            }
                            doMixed();
                        });
                        if (angular.isArray(dependencyWatch)) {
                            angular.forEach(dependencyWatch, function(dep) {
                                scope.$on('quickList.' + dep + '.change', function() {
                                    if (collapsed) {
                                        doExpandFromMixed();
                                    }
                                    doMixed();
                                });
                            });
                        }
                    }

                    if (angular.isDefined(attrs.isMixedMode) && scope.tocView !== 'thumbnail' &&
                        angular.isUndefined(parent.attr('hasQuickListListner'))) {
                        if (angular.isArray(dependencyWatch)) {
                            angular.forEach(dependencyWatch, function(dep) {
                                scope.$watch(dep, function(newVal, oldVal) {
                                    if (newVal === oldVal) { return; }
                                    var timer = $timeout(function() {
                                        $rootScope.$broadcast('quickList.' + dep + '.change', newVal);
                                    }, 1000);
                                    scope.$on('$destroy', function destroy() {
                                        $timeout.cancel(timer);
                                    });
                                });
                            });
                        }
                        parent.attr('hasQuickListListner', '');
                    }

                    scope.$watch(attrs.isdropup, function(attrDropUp, old) {
                        if (angular.isUndefined(attrDropUp) || angular.isUndefined(old)) { return; }
                        scope.menuDirection = attrDropUp ? 'dropup' : 'dropdown';
                        scope.caretDirection = attrDropUp ? 'icon-caret-up' : 'icon-caret-down';
                    });

                    function stopEventPropagation(ev) {
                        ev.stopPropagation();
                    }

                    function doCollapse() {
                        var $wrapper = $(quicklinkTemplate);
                        $compile($wrapper)(scope);
                        el.after($wrapper)
                            .removeClass('quicklinks')
                            .addClass('dropdown-menu')
                            .appendTo($wrapper.find('li'));

                        collapsed = true;
                        scope.$broadcast('Realize.quicklinks.quickList.collapse');

                        $wrapper.find('.dropdown-toggle').on('click', stopEventPropagation);

                        scope.$on('$destroy', function() {
                            $wrapper.find('.dropdown-toggle').off('click', stopEventPropagation);
                        });
                    }
                    function isSingleLineFit() {
                        var minMultiLineFactor = 1.3;
                        return (el.children().length === 0) ||
                        el.innerHeight() <= minMultiLineFactor * angular.element(el.children()[0]).outerHeight();
                    }

                    function doMixed() {
                        var menuWrapper,
                            innerMenu,
                            quickListUl,
                            $dropdownToggle;
                        if (!isSingleLineFit()) {
                            menuWrapper = angular.element ($compile(mixedQuicklinkTemplate)(scope));
                            innerMenu = menuWrapper.find ('.dropdown-menu');
                            quickListUl = el[0];
                            el.append(menuWrapper);
                            for (var i = quickListUl.children.length - 2; i >= 0; i--) {
                                var qlLiElement = angular.element (quickListUl.children[i]),
                                    qlLiScope = angular.element (qlLiElement).scope();
                                if (!qlLiScope.hidden) {
                                    innerMenu.prepend(quickListUl.children[i]);
                                    if (isSingleLineFit()) {
                                        break;
                                    }
                                }
                            }
                            $dropdownToggle = menuWrapper.find('.dropdown-toggle');
                            $dropdownToggle.on('click', stopEventPropagation);
                            scope.$on('$destroy', function() {
                                $dropdownToggle.off('click', stopEventPropagation);
                            });

                            collapsed = true;
                            scope.$broadcast('Realize.quicklinks.quickList.collapse');
                        }
                    }
                    function doExpandFromMixed() {
                        var innerMenu = el.find('.dropdown-menu'),
                        all = el[0],
                        dropDownItem = all.children[all.children.length - 1];
                        if (dropDownItem.children[0].tagName === 'UL') {
                            all.removeChild(dropDownItem);
                            el.append(innerMenu.children());
                        }
                        collapsed = false;
                    }

                    function doExpand() {
                        // unwrap it
                        var wrapper = el.parents('ul.quick-list-dropdown');
                        if (wrapper.length > 0) {
                            wrapper.after(el);
                            wrapper.remove();
                            el.removeClass('dropdown-menu').addClass('quicklinks');
                        }

                        collapsed = false;
                        scope.$broadcast('Realize.quicklinks.quickList.expand');
                    }

                    var quicklinkDisplayChangeHandler = function() {
                        var collapsedFn = $parse(attrs.collapsed);
                        ctrl.$calcVisibleChildren();

                        if (ctrl.$visibleChildCount <= 1) {
                            doExpand();

                        } else if (collapsedFn()) {
                            doCollapse();
                        }
                    };
                    el.on('quicklinkDisplayChange', quicklinkDisplayChangeHandler);
                    ctrl.$calcVisibleChildren();
                    if (scope.tocView === 'thumbnail') {
                        quicklinkTimer = $timeout(quicklinkDisplayChangeHandler, 0);
                    }

                    scope.$watch(attrs.collapsed, function(attrCollapsed, old) {
                        if (angular.isUndefined(attrCollapsed) || angular.isUndefined(old)) { return; }

                        ctrl.$calcVisibleChildren();
                        if (!collapsed && attrCollapsed && ctrl.$visibleChildCount > 1) {
                            doCollapse();
                        } else if (collapsed) {
                            doExpand();
                        }
                    });

                    scope.$on('$destroy', function() {
                        $timeout.cancel(quicklinkTimer);
                        $timeout.cancel(mixedModeTimer);
                    });
                }
            };
        }
    ]);
