angular.module('Realize.tinCanConfigService', [
        'Realize.paths'
    ]).service('TinCanConfigService', [
        '$http',
        '$log',
        '$q',
        'PATH',
        function($http, $log, $q, PATH) {
            'use strict';

            var service = this;

            service.getTinCanSCOSettings = function(userAssignmentId) {
                var urlTCConfig = PATH.REST + '/tincan/configs?userAssignmentId=' + userAssignmentId;
                return $http({
                    url: urlTCConfig,
                    method: 'GET'
                }).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('error getting tincansco settings', err);
                    return $q.reject('error getting incansco settings', err);
                });
            };

            service.getTinCanAuthToken = function() {
                var urlTCToken = PATH.REST +  '/tincan/authorization';
                return $http({
                    url: urlTCToken,
                    method: 'GET'
                }).then(function(response) {
                    return response.data;
                }, function(err) {
                    $log.error('error getting authorization token', err);
                    return $q.reject('error getting authorization token', err);
                });
            };
        }
]);
