angular.module('RealizeDirectives.formResetOn', [])
    .directive('resetOn', function resetFormOn() {
        'use strict';

        return {
            link: function(scope, el, attrs) {
                if (angular.isFunction(el[0].reset)) {
                    scope.$watch(attrs.resetOn, function() {
                        if (scope.$eval(attrs.resetOn)) {
                            el[0].reset();
                        }
                    });
                }
            }
        };
    });
