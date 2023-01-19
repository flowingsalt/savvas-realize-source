angular.module('RealizeDirectives')
    .directive('searchInput', [
        '$log',
        'Messages',
        'BrowserInfo',
        function($log, Messages, BrowserInfo) {
            'use strict';

            return {
                scope: {
                    keywords: '=?',
                    submitFn: '&onSubmit',
                    placeholder: '@',
                    submitText: '@',
                    populateKeywordsFn: '&'
                },
                replace: true,
                template: [
                    '<form ng-submit="submit()" class="searchInputForm" name="searchInputForm">',
                        '<div class="searchField clearfix" ng-class="{focused: searchInputFocused}">',
                            '<label for="directiveSearchInput" class="a11yOffScreen" >{{ placeholder }}</label>',
                            '<input id="directiveSearchInput" type="text" ng-model="newKeywords" black-list="/" ',
                                'ng-focus="searchInputFocused = 1" ng-blur="searchInputFocused = 0" ',
                                'placeholder="{{ placeholder }}" placeholder-shim ',
                                'ng-click="$event.stopPropagation()" />',
                            '<button type="submit" ng-disabled="!newKeywords || searchInputForm.$pristine">',
                                '{{ submitText || ("header.search.button.text" | lwcI18n) }}',
                            '</button>',
                        '</div>',
                    '</form>'
                ].join(''),
                link: function(scope, element, attrs) {
                    var ieInputFocusHandler,
                        handleInputFocus,
                        $input;
                    if (angular.isFunction(scope.populateKeywordsFn)) {
                        scope.keywords = scope.populateKeywordsFn()();
                    }

                    scope.getMessage = Messages.getMessage;
                    scope.newKeywords = scope.keywords;
                    //fix for ie 8 and ie 9 browser issue with textbox
                    if (BrowserInfo.browser.isMIE &&
                        (BrowserInfo.browser.msieVersion === 8 || BrowserInfo.browser.msieVersion === 9)) {
                        ieInputFocusHandler = function(event) {
                            $(this).blur().focus();
                            $(this).off(event);
                        };
                        handleInputFocus = function(event) {
                            if (angular.isFunction(ieInputFocusHandler)) {
                                ieInputFocusHandler(event);
                                ieInputFocusHandler = undefined;
                            }
                        };
                        $input = element.find('input');
                        $input.on('keydown mousedown', handleInputFocus);
                    }

                    if (angular.isDefined(scope.keywords) && scope.$eval(attrs.bind)) {
                        scope.$watch('newKeywords', function(value) {
                            scope.keywords = value;
                        });
                    }

                    scope.$on('searchInput.clear', function() {
                        scope.newKeywords = '';
                    });

                    scope.submit = function() {
                        scope.submitFn({keywords: scope.newKeywords});
                    };

                    scope.$on('$destroy', function() {
                        if (ieInputFocusHandler) {
                            $input.off('keydown mousedown', handleInputFocus);
                        }
                    });
                }
            };
        }
    ]);
