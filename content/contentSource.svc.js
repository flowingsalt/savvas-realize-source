angular.module('Realize.content.contentSourceService', [
    'Realize.content.model.contentItem',
    'Realize.content.model.openEdItem'
])
    .factory('ContentSource', [
        'Content',
        'OpenEdItem',
        '$location',
        function(Content, OpenEd, $location) {
            'use strict';

            var openEdLowerCase = 'opened',
                service = function(provider) {
                if (angular.isString(provider)) {
                    provider = provider.toLowerCase();
                    if (provider === openEdLowerCase) { return OpenEd; }
                    return Content;
                }
                return Content;
            };

            service.PROVIDER = {
                Open_ED: 'OpenEd',
                REALIZE: 'Realize',
                GOORU: 'Gooru'
            };
            service.PROVIDER.PATH = {
                'Realize': '/search',
                'OpenEd': '/searchOpenEd'
            };

            service.PROVIDER.FILE_TYPE = {
                'OpenEd': 'OpenEd'
            };

            service.PROVIDER.VERSION = {
                'OpenEd': 'open_ed'
            };

            service.getByPath = function(path) {
                path = path || $location.path();
                if (path.indexOf(service.PROVIDER.PATH.OpenEd) >= 0 ||
                    path.indexOf('/' + service.PROVIDER.VERSION.OpenEd) >= 0) {
                    return OpenEd;
                }
                return Content;
            };

            return service;
        }
    ]);
