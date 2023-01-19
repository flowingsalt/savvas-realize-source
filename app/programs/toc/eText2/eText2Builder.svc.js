angular.module('Realize.eText2Builder.eText2BuilderService', [
    'Realize.myContent.myContentDataService'
])
    .factory('EText2BuilderService', [
        '$q',
        'MyContent',
        function($q, MyContent) {
            'use strict';

            var service = {};

            service.createEText2Selection = function(containerId, params) {
                var addContentItemPromise = MyContent.addContentItemToMyLibrary({
                    json : angular.toJson(params)
                }, containerId);

                return addContentItemPromise;
            };

            return service;
        }
    ]);
