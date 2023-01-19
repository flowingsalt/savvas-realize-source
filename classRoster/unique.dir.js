angular.module('RealizeApp')
    .directive('crUnique', [
        '$log',
        function($log) {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    ctrl.$parsers.unshift(function(viewValue) {
                        if (viewValue) {
                            var list = scope.$eval(attrs.crUnique),
                                field = attrs.crUniqueField,
                                found;

                            // if a field is provided assume we are searching an array of objects
                            if (field) {
                                found = _.find(list, function(item) {
                                    return item[field] === viewValue;
                                });
                            } else {
                                found = _.contains(list, viewValue);
                            }

                            if (found) {
                                $log.log('crUnique duplicate found!', found);
                            }

                            ctrl.$setValidity('unique', !!!found);
                        }

                        // always return the value, we only invalidate, don't block the model
                        return viewValue;
                    });
                }
            };
        }
    ]);
