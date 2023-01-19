angular.module('Realize.admin.commonCartridge.cartridgeDataService', [
        'Realize.paths'
    ]).service('CommonCartridgeDataSvc', [
        '$http',
        'PATH',
        function($http, PATH) {
            'use strict';

            var CC_ENDPOINT = PATH.REST + '/commoncartridge';

            this.createCartridge = function(cartridgeInfo) {

                return $http.post(CC_ENDPOINT, cartridgeInfo, {
                    headers: {'Content-Type': undefined},
                    transformRequest: function() {
                        var formData = new FormData();
                        formData.append('programId', cartridgeInfo.programId);
                        formData.append('programVersion', cartridgeInfo.programVersion);
                        formData.append('includeAccessRole', cartridgeInfo.includeAccessRole);
                        formData.append('includeAuthoredKeywords', cartridgeInfo.includeAuthoredKeywords);
                        formData.append('includeGradeLevelMetadata', cartridgeInfo.includeGradeLevelMetadata);
                        formData.append('createKeywordsFromContainer', cartridgeInfo.createKeywordsFromContainer);
                        formData.append('ccVersion', cartridgeInfo.ccVersion);
                        formData.append('standardsProvider', cartridgeInfo.standardsProvider || '');
                        formData.append('standardsRegion', cartridgeInfo.standardsRegion || '');
                        formData.append('standardsVersion', cartridgeInfo.standardsVersion || '');
                        formData.append('standardsMapping', cartridgeInfo.standardsMapping);

                        return formData;
                    }
                });
            };

            this.listCartridges = function() {
                return $http.get(CC_ENDPOINT);
            };

            this.deleteCartridge = function(ccId) {
                return $http.delete([CC_ENDPOINT, ccId].join('/'));
            };

            this.undeleteCartridge = function(ccId) {
                return $http.post([CC_ENDPOINT, ccId, 'undelete'].join('/'));
            };
        }
    ]);
