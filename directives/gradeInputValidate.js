angular.module('RealizeApp')
    .directive('gradeInputValidate', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    ctrl.$parsers.unshift(function(viewValue) {
                        if (!viewValue) {
                            return;
                        }

                        var rTest = /^\s*-?[0-9]{1,3}\s*$/;

                        ctrl.$setValidity('pattern', rTest.test(viewValue));

                        return viewValue;
                    });
                }
            };
        }
    ]);
