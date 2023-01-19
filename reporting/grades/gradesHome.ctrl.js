// gradesHome.ctrl.js
angular.module('Realize.reporting.grades.GradesHomeCtrl', [
        'Realize.reporting.ReportService'
    ])
    .controller('GradesHomeCtrl', [
        '$scope',
        'RosterData',
        'ReportService',
        '$location',
        function($scope, RosterData, ReportService, $location) {
            'use strict';

            $scope.rosters = RosterData;

            ReportService.resetReportFilters();

            $scope.openRoster = function(e, roster) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                $location.path([$location.path(), roster.classId, 'overview'].join('/'));
            };
        }
    ]);
