angular.module('RealizeDataServices')
    .directive('rumbaUsernameAvailable', [
        '$log',
        'RumbaDataService',
        function($log, RumbaDataService) {
            'use strict';

            return {
                require: 'ngModel',
                link: function(scope, el, attrs, ctrl) {
                    ctrl.$parsers.unshift(function(viewValue) {
                        if (viewValue) {
                            RumbaDataService.checkUsernameAvailability(viewValue)
                                .then(function(result) {
                                    // it's possible that multiple async calls could fire, make sure we're still current
                                    if (ctrl.$viewValue === viewValue) {
                                        ctrl.$setValidity('rumbaUsername', result && result !== 'false');
                                    }
                                });
                        }

                        // always return the value, we only invalidate, don't block the model,
                        // RUMBA will gen a new one anyway...
                        return viewValue;
                    });
                }
            };
        }
    ]);
