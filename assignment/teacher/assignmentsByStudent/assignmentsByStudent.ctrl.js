angular.module('Realize.assignment.teacher.assignmentsByStudent', [])
    .controller('AssignmentsByStudentCtrl', [
        '$scope',
        '$routeParams',
        '$location',
        'RosterData',
        'ClassComments',
        function($scope, $routeParams, $location, RosterData, ClassComments) {
            'use strict';
            $scope.classComments = ClassComments;
            $scope.currentRoster = RosterData;
            $scope.selectedStudent = _.findWhere($scope.currentRoster.students, {
                userId: $routeParams.userId
            });

            $scope.back = function() {
                $scope.goBack($location.path().split('/student')[0] + '/assignments', true);
            };

            $scope.viewStudent = function(student) {
                $location
                    .path('classes/' + $scope.currentRoster.classId + '/student/' + student.userId + '/assignments');
            };
        }
    ]);
