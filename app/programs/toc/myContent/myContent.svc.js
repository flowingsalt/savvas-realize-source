angular.module('Realize.myContent.myContentDataService', [
    'Realize.paths',
    'Realize.api',
    'rlzComponents.components.myLibrary.services.myContent'
])
    .factory('MyContent', [
        '$http',
        '$q',
        '$log',
        '$rootScope',
        'REST_PATH',
        'myContentService',
        function($http, $q, $log, $rootScope, REST_PATH, myContentService) {
            'use strict';

            var service = function() {};

            service.get = function(query) {
                return myContentService.get(query);
            };

            service.removeMyUploadsItem = function(itemId) {
                return myContentService.removeMyUploadsItem(itemId);
            };

            service.undoRemoveMyUploadsItem = function(itemId, containerId) {
                return myContentService.undoRemoveMyUploadsItem(itemId, containerId);
            };

            service.addContentItemToMyLibrary = function(itemDetails, containerId) {
                return myContentService.addContentItemToMyLibrary(itemDetails, containerId);
            };

            service.makeDefaultView = function(itemId, isDefaultView, isActive) {
                return myContentService.makeDefaultView(itemId, isDefaultView, isActive);
            };

            service.getOriginalIdFromCustomized = function(itemId) {
                return myContentService.getOriginalIdFromCustomized(itemId);
            };

            service.buildStringOriginalIdCustomizedIdForItem = function(targetItem) {
                return myContentService.buildStringOriginalIdCustomizedIdForItem(targetItem);
            };

            //Unused?
            service.getCustomToOriginalIdMap = function() {
                var url = REST_PATH + '/item/originalItemId/list';
                var promise = $http.get(url).then(function(response) {
                    return response.data;
                });

                return promise;
            };

            // We display a 'success' message in my_content.jsp after the user has successfully uploaded
            // a file, link, or assessment.  Since those pages are in a different scope, we use this service
            // to store the success values.
            service.setSuccessMsgFlag = function(fileLinkOrAssessment, trueOrFalse) {
                if (!service.updateNotifications) {
                    service.updateNotifications = {};
                }
                service.updateNotifications[fileLinkOrAssessment] = trueOrFalse;
            };

            service.getSuccessMsgFlag = function(fileLinkOrAssessment) {
                if (!service.updateNotifications) {
                    service.updateNotifications = {};
                }
                return service.updateNotifications[fileLinkOrAssessment];
            };

            service.clearSuccessMsgFlag = function() {
                service.updateNotifications = {};
            };

            service.getMultiSelectStatus = function() {
                return service.checkBoxList;
            };

            service.setMultiSelectStatus = function(checkBoxList) {
                service.checkBoxList = checkBoxList;
            };

            return service;
        }
    ]);
