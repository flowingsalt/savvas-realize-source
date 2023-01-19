angular.module('RealizeApp')
    .directive('blackList', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    ctrl.$parsers.push(function(viewValue) {
                        var transformedInput = viewValue,
                            i, len;

                        for (i = 0, len = attrs.blackList.length; i < len; i++) {
                            transformedInput = viewValue.replace(attrs.blackList[i], '');
                        }

                        if (transformedInput !== viewValue) {
                            ctrl.$setViewValue(transformedInput);
                            ctrl.$render();
                        }

                        return transformedInput;
                    });
                }
            };
        }
    ]);
