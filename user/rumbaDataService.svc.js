angular.module('RealizeDataServices')
    .service('RumbaDataService', [
        '$http',
        '$q',
        'REST_PATH',
        function($http, $q, REST_PATH) {
            'use strict';

            var service = this;

            service.getOrgDetails = function(ids) {
                return $http.get(REST_PATH + '/rumba/orgs', {
                        params: {
                            'id[]': ids
                        },
                        cache: true
                    })
                    .then(function(response) {
                        return response.data;
                    }, function(errResponse) {
                        return $q.reject(errResponse);
                    });
            };

            service.checkUsernameAvailability = function(username) {
                var url = REST_PATH + '/check_username';

                return $http.get(url, {
                        params: {
                            username: username
                        },
                        cache: true
                    })
                    .then(function(response) {
                        return response.data;
                    }, function(errResponse) {
                        return $q.reject(errResponse);
                    });
            };

            service.getProductDetails = function(productId) {
                var url = REST_PATH + '/rumba/products/' + productId;

                return $http.get(url, {
                    cache: true
                }).then(function(response) {
                    return response.data;
                }, function(errResponse) {
                    return $q.reject(errResponse);
                });
            };
        }
    ]);
