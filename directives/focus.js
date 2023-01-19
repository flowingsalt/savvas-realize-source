angular.module('RealizeApp')
    .directive('ngFocus', [
        '$log',
        '$parse',
        function($log, $parse) {
            'use strict';

            return function(scope, el, attr) {
                var fn = $parse(attr.ngFocus);
                el.on('focus', function(event) {
                    if (scope.$eval(attr.timeoutApplyOnFocus)) {
                        setTimeout(function() {//Take it out of digest cycle
                            scope.$apply(function() {
                                fn(scope, {$event:event});
                            });
                        });
                    } else {
                        scope.$apply(function() {
                            fn(scope, {$event:event});
                        });
                    }
                });
            };
        }
    ]);
