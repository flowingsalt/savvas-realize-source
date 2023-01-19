angular.module('RealizeApp')
    .directive('replaceWith', [
        '$log',
        '$http',
        '$templateCache',
        '$compile',
        function($log, $http, $templateCache, $compile) {
            'use strict';

            return {
                restrict: 'EA',
                terminal: true,
                replace: true,
                compile: function(element, attr) {
                    var srcExp = attr.replaceWith;

                    return function(scope, element) {
                        scope.$watch(srcExp, function ngIncludeWatchAction(src) {
                            if (src) {
                                $http.get(src, {cache: $templateCache})
                                    .then(function(response) {
                                        var contents = angular.element('<div/>').html(response.data).contents();
                                        element.replaceWith($compile(contents)(scope));
                                    }, function(error) {
                                        $log.error('Failed to load template: ', error);
                                    });
                            }
                        });
                    };
                }
            };
        }
    ]);
