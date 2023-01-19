angular.module('Realize.classLanding.studentClassesCtrl', [])
.controller('StudentClassesCtrl', [
    '$scope',
    'RosterData',
    '$location',
    'lwcI18nFilter',
    function($scope, RosterData, $location, lwcI18nFilter) {
        'use strict';

        $scope.rosters = RosterData;

        $scope.openRoster = function(e, roster) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            $location.path('/classes/' + roster.classId + '/assignments');
        };
        $scope.messageFormat = lwcI18nFilter('classListStudent.status.nextAssignmentDue');

        $scope.openDiscussions = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            $location.path('/classes/' + roster.classId + '/discussPrompt');
        };
    }
]);
