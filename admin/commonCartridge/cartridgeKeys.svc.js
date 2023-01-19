angular.module('Realize.admin.commonCartridge.keysetService', [
        'Realize.paths'
    ])
    .service('keysetService', [
        '$http',
        'PATH',
        function KeysetService($http, PATH) {
            'use strict';

            var PLACEHOLDERS = {
                CONSUMERKEY: '{ConsumerKey}',
                ORG_ID: '{OrgID}'
            },
                ENDPOINTS = {
                CREATE: PATH.REST + '/commoncartridge/keysets/',
                UPDATE: [
                    PATH.REST,
                    '/commoncartridge/keysets/',
                    PLACEHOLDERS.CONSUMERKEY,
                    '/programs'
                ].join(''),
                DELETE: PATH.REST + '/commoncartridge/keysets/',
                SEARCH: PATH.REST + '/commoncartridge/consumers',
                ORG_PROGRAMS: [
                    PATH.REST,
                    '/commoncartridge/keysets/',
                    PLACEHOLDERS.ORG_ID,
                    '/programs'
                ].join('')
            };

            this.createKeyset = function createKeyset(orgId, programIds) {
                return $http.post(ENDPOINTS.CREATE + orgId, {
                    programIds: programIds
                });
            };

            this.search = function searchForKeysets(searchTerm) {
                return $http.get(ENDPOINTS.SEARCH + '?keyword=' + searchTerm);
            };

            this.deleteKeyset = function deleteKeyset(consumerKey) {
                return $http.delete(ENDPOINTS.DELETE + consumerKey, {
                    params: {
                        consumerKey: consumerKey
                    }
                });
            };

            this.updateKeyset = function updateKeyset(keyset) {

                //override interceptor that turns request payload into form data and just use json
                var editConfig = {
                    data: {
                        programIds: keyset.products
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'PUT',
                    transformRequest: function transformEditKeysetRequest(data) {
                        return JSON.stringify(data);
                    },
                    url: ENDPOINTS.UPDATE.replace(PLACEHOLDERS.CONSUMERKEY, keyset.consumerKey)
                };

                return $http(editConfig);
            };

            this.getProgramsForOrg = function(orgId) {
                return $http.get(ENDPOINTS.ORG_PROGRAMS.replace(PLACEHOLDERS.ORG_ID, orgId))
                    .then(function getResults(response) {
                        return response.data.results;
                    });
            };
        }
    ]);
