angular.module('Realize.eText2Builder.eText2DataService', [
    'Realize.content.model.contentItem'
])
    .factory('EText2DataService', [
        '$q',
        'Content',
        function($q, Content) {
            'use strict';

            var service = {};

            service.getEText2StudentEdition = function(program) {
                var deferred = $q.defer();

                if (program.library && program.library.length > 0) {
                    Content.queryFast({
                        LIBRARY_TITLE: program.library[0],
                        MEDIA_TYPE: 'Selected Reading',
                        NOT_ITEM_STATUS: ['deleted', 'archived']
                    }, function(etexts) {
                        deferred.resolve(etexts);
                    }, function(err) {
                        deferred.reject(err);
                    });
                } else {
                    deferred.resolve([]);
                }

                return deferred.promise;
            };

            return service;
        }
    ]);
