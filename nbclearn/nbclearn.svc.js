angular.module('Realize.NbcLearn.NbcLearnService', [])
.provider('NbcLearnService', [
    function() {
        'use strict';

        var embedPath;

        this.setEmbedPath = function(path) {
            embedPath = path;
        };

        this.$get = ['$log', '$http', function($log, $http) {
            var svc = this;

            svc.getEmbedUrl = function(link) {
                var cueCardId = link.replace(/^.+cuecard=(\d+).*/, '$1');
                return $http.get(embedPath, {params: { id: cueCardId }}).then(
                    function(result) {
                        var path = result.data.replace(/\"/g, '');
                        return path;
                    },
                    function(error) {
                        $log.error('Error retrieving URL for NBC Learn: ', error);
                        return error;
                    }
                );
            };

            return svc;
        }];
    }
]);
