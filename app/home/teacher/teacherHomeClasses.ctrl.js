angular.module('RealizeApp')
.controller('TeacherHomeClassesCtrl', [
    'Permissions',
    '$scope',
    '$location',
    'HOME_STATES',
    function(Permissions, $scope, $location, STATE) {
        'use strict';

        if (!$scope.classesCreated) {
            $scope.phase.classes.header = STATE.notStarted;

            if (Permissions.hasPermission('create_class')) {
                $scope.phase.classes.content = STATE.noClass;
                $scope.phase.classes.quickLink = STATE.create;
            } else if (Permissions.hasPermission('edit_class_in_SIS')) {
                $scope.phase.classes.content = STATE.noAssociatedPrograms;
                $scope.phase.classes.quickLink = STATE.none;
            }

        } else {
            //when classesCreated true, homeTeacherCtrl.rosters.load.complete will be triggered
            if (!$scope.classesVisited && !$scope.assignmentsCreated) {
                $scope.phase.classes.header = STATE.notStarted;
                $scope.phase.classes.content = STATE.existingClass;
            } else if ($scope.classes.length > 0 || $scope.rostersLoading) {
                $scope.phase.classes.header = !$scope.assignmentsCreated ? STATE.inProgress : STATE.complete;
                $scope.phase.classes.content = STATE.loading;
            }
        }

        $scope.$on('homeTeacherCtrl.rosters.load.complete', function() {
            if ($scope.phase.classes.content === STATE.loading) {
                if ($scope.classes.length === 0) {
                    $scope.phase.classes.content = STATE.allHidden;
                } else if ($scope.classes.length > 0) {
                    $scope.phase.classes.content = STATE.complete;
                }
            }

            if ($scope.classes.length === 0 && Permissions.hasPermission('create_class')) {
                $scope.phase.classes.quickLink = STATE.create;
            } else if ($scope.classes.length === 1) {
                $scope.phase.classes.quickLink = STATE.oneClass;
            } else if ($scope.classes.length > 1) {
                $scope.phase.classes.quickLink = STATE.manyClasses;
            }
        });

        $scope.more = function(e) {
            e.preventDefault();
            e.stopPropagation();

            switch ($scope.phase.classes.quickLink) {
                case STATE.create:
                    if (Permissions.hasPermission('create_class')) {
                        $location.path('/classes/create');
                    }
                    break;

                case STATE.oneClass:
                    $location.path('/classes/' + $scope.classes[0].classId + '/assignments');
                    break;

                default:
                    $location.path('/classes');
                    break;
            }

            $scope.currentUser.setAttribute('classes.visited', true);
        };

        $scope.open = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();

            $location.path(['/classes', roster.classId, 'assignments'].join('/'));
        };
    }
]);
