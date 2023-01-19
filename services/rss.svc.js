angular.module('Realize.rss.RssSvc', [])
.provider('RssSvc', [
    function() {
        'use strict';

        var serviceUrl;

        this.setUrl = function(url) {
            serviceUrl = url;
        };

        this.$get = [
            '$log',
            '$http',
            function($log, $http) {
                var svc = this,
                    getSuccess = function(data) {return data.data;},
                    getFailure = function(error) {return error;};

                svc.query = function(feedId, params) {
                    return $http.get(serviceUrl + feedId, {'params': params}).then(getSuccess, getFailure);
                };

                svc.get = function(feedId, articleId, params) {
                    return $http.get(serviceUrl + feedId + '/' + articleId, {'params': params})
                        .then(getSuccess, getFailure);
                };

                return svc;
            }
        ];
    }
]);
