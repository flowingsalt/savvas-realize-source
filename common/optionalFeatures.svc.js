angular.module('Realize.common.optionalFeaturesService', [
])
    .provider('OptionalFeatures', function optionalFeaturesProvider() {
        'use strict';

        var servicesState = {};

        this.setServicesState = function(newServicesState) {
            servicesState = newServicesState;
        };

        this.updateServicesState = function(serviceKey, state) {
            if (servicesState) {     // Needed for fixing unit tests
                servicesState[serviceKey] = state;
            }
        };

        this.$get = function() {
            var svc = this;

            svc.isAvailable = function(key) {
                return servicesState[key] === 'true';

            };
            return svc;

        };
    });
