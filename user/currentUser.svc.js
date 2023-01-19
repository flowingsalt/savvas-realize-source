angular.module('Realize.user.currentUser', [
        'Realize.paths',
        'RealizeDataServices'
    ])
    .provider('$currentUser', function() {
        'use strict';

        var _preload = {};

        this.setPreloadData = function(data) {
            _preload = data;
        };

        this.$get = [
            'User',
            '$http',
            '$log',
            '$q',
            'REST_PATH',
            '$cacheFactory',
            function(User, $http, $log, $q, REST_PATH, $cacheFactory) {
                var currentUser = new User(_preload);

                currentUser.updateProductSubscriptions = function(products) {
                    products = angular.isArray(products) ? products : [products];

                    var url = REST_PATH + '/user/subscribe';

                    return $http.post(url, {
                            'courses[]': products
                        })
                        .then(function(response) {
                            currentUser.subscribedCourses = response.data;
                            angular.forEach(currentUser.oleAffiliations, function(affiliation) {
                                angular.forEach(affiliation.products, function(product) {
                                    if (_.contains(currentUser.subscribedCourses, product.productName)) {
                                        product.subscribed = true;
                                    }
                                });
                            });

                            return currentUser.subscribedCourses;
                        }, function(errResponse) {
                            $log.debug('error updating subscriptions: ', errResponse.data);
                            return $q.reject(errResponse.data);
                        })
                        .finally(function() { // TODO: event driven instead
                            var allProgramsUrl = [REST_PATH, 'programs'].join('/'),
                                allcentersUrl = [REST_PATH, 'centers'].join('/'),
                                cache = $cacheFactory.get('$http');

                            cache.remove(allProgramsUrl);
                            cache.remove(allcentersUrl);
                        });
                };

                return currentUser;
            }
        ];
    });
