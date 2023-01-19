angular.module('Realize.externalItem.OpenEd.Service', [])
    .factory('OpenEdItemService', [
        'USER_ATTRIBUTE_KEY',
        'ContentSource',
        function(UserAttributeKey, ContentSource) {
            'use strict';

            var service = function(helper) {

                var serviceObject = angular.extend(this, helper);

                serviceObject.getDismissTipsUserAttribute = function() {
                    return UserAttributeKey.DISMISS_OPEN_ED_SEARCH_TIPS_FOREVER;
                };

                serviceObject.getProviderName = function() {
                    return ContentSource.PROVIDER.Open_ED;
                };

                return serviceObject;
            };

            return service;
        }
    ]);
