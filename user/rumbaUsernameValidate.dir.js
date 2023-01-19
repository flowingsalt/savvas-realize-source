angular.module('RealizeDataServices')
    .directive('rumbaUsernameValidate', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    ctrl.$parsers.unshift(function(viewValue) {
                        if (!viewValue) {
                            return;
                        }

                        var rTest = /^[^,\s]+$/;

                        ctrl.$setValidity('minLength', viewValue.length >= 1);
                        ctrl.$setValidity('maxLength', viewValue.length <= 75);
                        ctrl.$setValidity('pattern', rTest.test(viewValue));

                        // we don't want to block the model like normal validation
                        return viewValue;
                    });
                }
            };
        }
    ]);
