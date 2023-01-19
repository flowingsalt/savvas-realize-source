angular.module('RealizeApp')
    .controller('InfoModalCtrl', [
        '$scope',
        'InfoModalService',
        'searchTelemetryUtilitiesService',
        'currentUser',
        function($scope, InfoModalSvc, searchTelemetryUtilitiesService, currentUser) {
            'use strict';

            $scope.showBreadcrumbEllipsis = false;
            $scope.locale = currentUser.userAttributes['profile.locale'];

            $scope.isCustomerAdmin = InfoModalSvc.isCustomerAdmin();

            $scope.hideInfoItem = function(infoItem) {
                return InfoModalSvc.hideInfoItem(infoItem);
            };

            $scope.hideInfoItemFromStudent = function(infoItem) {
                return InfoModalSvc.hideInfoItemFromStudent(infoItem);
            };

            $scope.hideInfoItemOnLevels  = function() {
                return InfoModalSvc.hideInfoItemFromStudent($scope.levelsArray);
            };
            $scope.levelsArray = InfoModalSvc.createLevelsArray($scope.item);
            $scope.breadcrumbHandler = function(event, url, breadcrumbData) {
                if (event) {
                    event.stopPropagation();
                }
                searchTelemetryUtilitiesService.sendTelemetryEventsFromSearch(event, breadcrumbData, 'infoModal');
                InfoModalSvc.navigateToSourceProgram(url);
            };
        }
    ]);
