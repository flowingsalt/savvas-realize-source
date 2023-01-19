angular.module('Realize.alerts.alertService', [])
    .factory('AlertService', [
        '$rootScope',
        function($rootScope) {
            'use strict';

            var service = {};

            service.alerts = [];

            //lifespan tracks how many pages we've traversed till we need to "pop" the alert
            //lifespan=1 means alert should be removed after navigating to another page
            //lifespan=2 means alert should be removed after changing routes twice
            service.addAlert = function(newAlertType, newAlertIcon, newAlertMsg, newAlertLifespan) {
                service.alerts.push({
                    type: newAlertType,
                    icon: newAlertIcon,
                    msg: newAlertMsg,
                    lifespan: newAlertLifespan
                });
            };

            service.alertIsSet = function() {
                return service.alerts[0] && service.alerts[0].msg !== '';
            };

            service.removeAlert = function() {
                service.alerts.splice(0, 1);
            };

            $rootScope.$on('$routeChangeStart', function() {
                if (service.alerts[0] && service.alerts[0].lifespan) {

                    service.alerts[0].lifespan--;

                    if (service.alerts[0].lifespan <= 0) {
                        service.removeAlert();
                    }
                }
            });

            return service;
        }
    ]);
