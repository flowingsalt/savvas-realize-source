angular.module('Realize.admin.landing.adminLandingController', [
    'rlzComponents.components.i18n',
    'Realize.common.alerts',
    'components.realize.user',
    'rlzComponents.adminToolsTelemetryModule',
])
    .controller('AdminLandingController', [
        '$scope',
        '$log',
        '$route',
        '$filter',
        '$window',
        'AlertService',
        'LwcRumbaDataService',
        'adminToolsTelemetryService',
        'featureManagementService',
        function($scope, $log, $route, $filter, $window, AlertService, LwcRumbaDataService,
            adminToolsTelemetryService, featureManagementService) {
            'use strict';

            $scope.back = function(e) {
                e.stopPropagation();
                $window.parent.location.href = $window.location.protocol +
                '//' + $window.location.hostname + '/dashboard/program';
            };

            // To get the alert messages details for clear cache
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();

            $scope.openLTIWebAdminUrl = function() {
                $scope.isLoading = true;
                adminToolsTelemetryService.sendTelemetryEvent();
                if ($window.ltiServiceWebAdminUrl) {
                    LwcRumbaDataService.getSAMLTicket($window.ltiServiceWebAdminUrl)
                        .then(function(response) {
                            $scope.isLoading = false;
                            var ltiServiceWebAdminUrl = $window.ltiServiceWebAdminUrl + '?ticket=' + response;
                            $window.open(ltiServiceWebAdminUrl, '_blank');
                        }, function(err) {
                            $scope.isLoading = false;
                            $log.error('Failed to get saml ticket', err);
                        });
                } else {
                    $log.error('ltiServiceWebAdminUrl is not defined');
                }
            };

            $scope.openSavvyAdminUrl = function() {
                if ($window.savvyAdminAppBaseUrl) {
                    $window.open($window.savvyAdminAppBaseUrl, '_blank');
                } else {
                    $log.error('savvyAdminAppBaseUrl is not defined');
                }
            };

            $scope.openSkillsStandardsUrl = function() {
                if (featureManagementService.isSkillsStandardsAppEnabled()) {
                    $window.open($window.skillsStandardsBaseUrl, '_blank');
                } else {
                    $window.open('/community/SkillsAndStandardsTool.jsp', '_blank');
                }
            };
        }
    ]);
