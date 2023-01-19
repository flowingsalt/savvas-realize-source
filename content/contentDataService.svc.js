//TODO: All the $http/ $resource data service in content.js should be placed here.
angular.module('Realize.content.contentDataService', [
    'Realize.content.constants',
    'Realize.paths'
])
    .factory('ContentDataService', [
        '$http',
        '$q',
        '$log',
        'REST_PATH',
        'CONTENT_CONSTANTS',
        function($http, $q, $log, REST_PATH, CONTENT_CONSTANTS) {
            'use strict';

            var service = {};

            service.getAvailableBankPlayerTarget = function(programLibraries) {
                return $http({
                    url: REST_PATH + '/items',
                    method: 'GET',
                    params: {
                        'QUESTION_BANK_TYPE': CONTENT_CONSTANTS.QUESTION_BANK_TYPE.TEST,
                        'OLE_PRODUCT_ID': programLibraries,
                        'includedFacets[]': CONTENT_CONSTANTS.FACET.PLAYER_TARGET
                    }
                }).then(function(response) {
                    if (response.data) {
                        var playerTargetFacet = response.data.facets[0],
                            playerTargetList = [];

                        if (playerTargetFacet && playerTargetFacet.values) {
                            playerTargetList = _.chain(playerTargetFacet.values)
                                .pluck('value')
                                .map(function(playerTarget) {
                                    return playerTarget.toLowerCase();
                                })
                                .uniq()
                                .value();
                        }
                        return playerTargetList;
                    }
                }, function(err) {
                    $log.error('Failed to retrieve question bank facet', err);
                    return $q.reject('Failed to retrieve question bank facet', err);
                });
            };

            service.hasNonNativeBank = function(productId) {
                return service.getAvailableBankPlayerTarget(productId).then(function(playerTargetList) {
                    return _.find(playerTargetList, function(playerTarget) {
                        return playerTarget === CONTENT_CONSTANTS.PLAYER_TARGET.MATHXL ||
                            playerTarget === CONTENT_CONSTANTS.PLAYER_TARGET.TESTNAV;
                    }) !== undefined;
                });
            };

            service.getAvailableBankPlayerTargetMap = function(productId) {
                return service.getAvailableBankPlayerTarget(productId).then(function(playerTargetList) {
                    var nonNative = _.find(playerTargetList, function(playerTarget) {
                            return playerTarget === CONTENT_CONSTANTS.PLAYER_TARGET.MATHXL ||
                               playerTarget === CONTENT_CONSTANTS.PLAYER_TARGET.TESTNAV;
                        }),
                        native = _.find(playerTargetList, function(playerTarget) {
                            return playerTarget === CONTENT_CONSTANTS.PLAYER_TARGET.REALIZE;
                        });

                    return {
                        hasNative: angular.isDefined(native),
                        hasNonNative: angular.isDefined(nonNative)
                    };
                });
            };

            return service;
        }
    ]);
