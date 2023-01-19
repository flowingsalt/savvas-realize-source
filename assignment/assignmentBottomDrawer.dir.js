angular.module('Realize.assignment.bottomDrawer', [
    'Realize.assignment.utilService',
    'rlzComponents.components.featureManagement'
])
    .directive('assignmentBottomDrawer', [
        'AssignmentUtil',
        'breadcrumbTelemetryService',
        'BREADCRUMB_TELEMETRY_CONSTANTS',
        'featureManagementService',
        function assignmentBottomDrawerDir(AssignmentUtil, breadcrumbTelemetryService, BREADCRUMB_TELEMETRY_CONSTANTS,
            featureManagementService) {
            'use strict';

            return {
                templateUrl: 'templates/assignment/assignmentBottomDrawer.html',
                replace: true,
                link: function(scope) {
                    scope.orientation = 'HORIZONTAL';
                    scope.breadcrumbHandler = function($event, path, breadcrumb) {
                        $event.stopPropagation();
                        var breadcrumbItem = $event.currentTarget.text;
                        var extensionKeys = {
                            page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENT,
                            subpage: BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.ASSIGNMENTS_BY_CLASS_STATUS,
                            area: BREADCRUMB_TELEMETRY_CONSTANTS.AREA.CLASSES,
                        };
                        breadcrumbTelemetryService.sendTelemetryEvents(breadcrumbItem, breadcrumb, extensionKeys);
                        AssignmentUtil.navigateToSourceProgram(path);
                    };
                    scope.showExternalDrawer = function() {
                        return featureManagementService.isExternalSideDrawerEnabled();
                    };
                }
            };
        }]);
