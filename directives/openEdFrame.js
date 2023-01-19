angular.module('RealizeDirectives')
    .directive('openEdFrame', [
        '$sce',
        function($sce) {
            'use strict';

            return {
                replace: true,
                scope: {
                    item: '='
                },
                template: '<iframe class="openEdFrame" ng-src="{{ trustedUrl }}" ' +
                    'width="100%" frameBorder="0"></iframe>',
                link: function(scope) {
                    scope.$watch('item', function(newValue) {
                        if (newValue) {
                            scope.trustedUrl = $sce.trustAsResourceUrl(scope.item.url);
                        }
                    });
                }
            };
        }
    ]);
