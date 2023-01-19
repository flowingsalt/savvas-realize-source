angular.module('RealizeApp')
    .directive('ngBlur', [
        '$log',
        '$parse',
        function($log, $parse) {
            'use strict';

            return function(scope, el, attr) {
                var fn = $parse(attr.ngBlur);

                el.on('blur', function(event) {
                    scope.$applyAsync(function() {
                        fn(scope, {$event: event});
                    });
                });
            };
        }
    ]);
