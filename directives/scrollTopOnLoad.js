angular.module('Realize.ui.scrollTopOnLoad', [
    'duScroll'
])
    .directive('scrollTopOnLoad', [
        '$document',
        '$timeout',
        function($document, $timeout) {
            'use strict';

            return {
                scope: {
                    selector: '@scrollTopOnLoad'
                },
                link: function(scope) {
                    $timeout(function() {
                        if (scope.selector) {

                            var element = angular.element(scope.selector),
                                offset = element.offset().top;
                            $document.scrollToElement(element, offset);
                        } else {
                            $document.scrollTop(0);
                        }
                    }, 300);
                }
            };
        }
    ]);
