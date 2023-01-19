angular.module('Realize.externalItem.Strategy', [])
    .service('ExternalItemStrategy', [
        '$log',
        'ContentSource',
        'OpenEdItemService',
        '$location',
        function($log, ContentSource, OpenEdItemService, $location) {
            'use strict';

            var service = this;

            service.getExternalProviderName = function(path) {
                path = path || $location.path();

                if (ContentSource.PROVIDER.PATH.Realize !== path) {
                    return (_.invert(ContentSource.PROVIDER.PATH))[path];
                }
            };

            service.getInstance = function(path) {
                var self = this,
                    externalProviderName = service.getExternalProviderName(path);

                if (angular.isDefined(externalProviderName)) {
                    return new OpenEdItemService(self);
                }

                $log.info('Unable to determine external search provider', path);
            };

        }
    ]);
