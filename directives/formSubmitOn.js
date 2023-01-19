angular.module('RealizeDirectives.formSubmitOn', [])
    .directive('submitOn', function submitFormOn() {
        'use strict';

        return {
            link: function(scope, el, attrs) {
                if (angular.isFunction(el.submit) && attrs.submitOn && attrs.submitOn.length > 0) {
                    var unwatch = scope.$watch(attrs.submitOn, function() {
                        if (scope.$eval(attrs.submitOn)) {
                            el.submit();
                            //way for consumers to kill the $watch after a submit
                            if (scope.$eval(attrs.oneSubmit)) {
                                unwatch();
                            }
                        }
                    });
                }
            }
        };
    });
