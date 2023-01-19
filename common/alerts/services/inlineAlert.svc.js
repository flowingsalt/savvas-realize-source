angular.module('Realize.alerts.inlineAlertService', [])
    .factory('InlineAlertService', [
        '$log',
        function($log) {
            'use strict';

            var service = {};

            service.alerts = [];

            service.addAlert = function(id, options) {

                $log.debug('addAlert: ', id, options);

                service.getAlert(id, true);

                var alert = {
                    id: id,
                    alert: options
                };

                service.alerts.push(alert);
            };

            service.getAlert = function(id, pop) {
                var exists;

                exists = _.find(
                    service.alerts,
                    function(alert) {
                        return alert.id === id;
                    }
                );

                if (pop && exists) {
                    service.removeAlert(exists);
                }

                return exists;
            };

            service.removeAlert = function(alert) {
                service.alerts.splice(service.alerts.indexOf(alert), 1);
            };

            return service;
        }
    ]);
