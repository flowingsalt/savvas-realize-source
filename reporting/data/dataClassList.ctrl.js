angular.module('Realize.reporting.data.DataCtrl', [
    'Realize.reporting.ReportService',
    'Realize.core.security.permissions',
    'Realize.analytics',
    'Realize.filters.pipes',
    'Realize.filters.excludeCurrentUser',
    'Realize.filters.displayFullName',
    'rlzComponents.components.googleClassroom',
    'rlzComponents.components.featureManagement',
    'rlzComponents.components.googleClassroom.constants',
    'Realize.constants.googleClassroom',
])
.controller('DataCtrl', [
    '$scope',
    '$location',
    'RosterData',
    'AssignmentsCount',
    'ReportService',
    '$rootScope',
    'lwcI18nFilter',
    'PATH',
    'Permissions',
    'googleClassroomService',
    'GoogleClassroomConstants',
    'GOOGLE_CLASSROOM',
    'featureManagementService',
    function($scope, $location, RosterData, AssignmentsCount, ReportService, $rootScope, lwcI18nFilter,
            PATH, Permissions, googleClassroomService, GoogleClassroomConstants, GOOGLE_CLASSROOM,
            featureManagementService) {
        'use strict';

        $scope.location = $location;
        $scope.rosters = RosterData;
        $scope.assignmentsCount = AssignmentsCount;

        var inactiveCount = $scope.currentUser.$getInactiveRosterCount();
        $scope.hasHidden = (inactiveCount && inactiveCount > 0);
        $scope.hasVisited = $scope.currentUser.getAttribute('data.visited');
        $scope.hasPermissionToCreateClass = Permissions.hasPermission('create_class');
        $scope.areAllClassesHidden = $scope.hasHidden && $scope.hasVisited && ($scope.rosters.length === 0);
        $scope.showGoogleClassroomIntegration = featureManagementService.isGoogleClassroomEnabled();
        $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

        if ($scope.assignmentsCount === 0) {
            $rootScope.subnavState = 'hidden';
        }

        ReportService.resetReportFilters();

        $scope.openRoster = function(e, roster, page) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            var p = '/data/' + roster.classId;
            if (page === 'byStandard') {
                p += '/standards';
            } else {
                p += '/overview';
            }
            $location.path(p);
        };

        $scope.imagePath = PATH.IMAGES;

        $scope.currentUser.setAttribute('data.visited', true);

        if ($rootScope.currentUser.isReviewer) {
            $scope.reviewTemplate = 'templates/partials/reviewer_zero_data.html';
            $scope.imagePath = PATH.IMAGES;
            $scope.isReviewer = true;
        }

        $scope.redirectToRealizeSyncWebApp = function() {
            var connectClassesTelemetryObject = {
                extensions: {
                    area: GOOGLE_CLASSROOM.DATA,
                    page: GOOGLE_CLASSROOM.GET_STARTED,
                    product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                    description: GoogleClassroomConstants.GOOGLE_CONNECT,
                },
                definition: {
                    name: GoogleClassroomConstants.CONNECT_CLASS,
                },
            };
            googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl(), GoogleClassroomConstants.IMPORT,
                connectClassesTelemetryObject);
        };

        $scope.createClass = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            $scope.pageLoading(); //IE workaround, prevent markup showing on create class page
            $location.path('/classes/create');
        };

        $scope.isFederatedUserHiddenClassesMessageVisible = $scope.areAllClassesHidden &&
            !$scope.hasPermissionToCreateClass;
        $scope.isBasicUserHiddenClassesMessageVisible = $scope.areAllClassesHidden &&
            $scope.hasPermissionToCreateClass;

    }
]);
