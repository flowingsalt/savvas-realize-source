angular.module('RealizeApp')
    .directive('validateInputMatch', [
        function() {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, elem, attrs, model) {
                    if (!attrs.validateInputMatch) {
                        throw('validateInputMatch expects a model as an argument!');
                    }

                    scope.$watch(attrs.validateInputMatch, function(value) {
                        // Only compare values if the second ctrl has a value.
                        if (model.$viewValue) {
                            model.$setValidity('validateInputMatch', value === model.$viewValue);
                        }
                    });

                    model.$parsers.push(function(value) {
                        if (!value) {
                            model.$setValidity('validateInputMatch', true);
                            return value;
                        }
                        var inputsMatch = value === scope.$eval(attrs.validateInputMatch);
                        model.$setValidity('validateInputMatch', inputsMatch);
                        return inputsMatch ? value : '';
                    });
                }
            };
        }
    ]);
