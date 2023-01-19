angular.module('RealizeApp')
.controller('TeacherHomeAssignmentsCtrl', [
    'Permissions',
    '$scope',
    '$location',
    '$log',
    'HOME_STATES',
    'ClassUtil',
    function(Permissions, $scope, $location, $log, STATE, ClassUtil) {
        'use strict';

        var hasAtLeastOneStudent,
            hasAtLeastOneClassWithProduct;

        $scope.phase.assignments.header = !$scope.assignmentsCreated ? STATE.notStarted : STATE.completed;

        if (!$scope.classesCreated) {

            if (Permissions.hasPermission('create_class')) {
                $scope.phase.assignments.content = STATE.noAssignment;
                $scope.phase.assignments.quickLink = STATE.create;
            } else if (Permissions.hasPermission('edit_class_in_SIS')) {
                $scope.phase.assignments.content = STATE.noAssociatedPrograms;
                $scope.phase.assignments.quickLink = STATE.none;
            }

        } else {
            //when classesCreated true, homeTeacherCtrl.rosters.load.complete will be triggered
            if (!$scope.assignmentsCreated) {
                $scope.phase.assignments.content = STATE.noAssignment;
            } else if ($scope.assignmentsCreated && $scope.classesCreated &&
                ($scope.classes.length > 0 || $scope.rostersLoading)) {

                $scope.phase.assignments.content = STATE.loading;
            }

        }

        $scope.$on('homeTeacherCtrl.rosters.load.complete', function() {
            hasAtLeastOneStudent = ClassUtil.hasAtLeastOneStudentInRosters($scope.classes);
            hasAtLeastOneClassWithProduct = ClassUtil.hasAtLeastOneClassWithProduct($scope.classes,
             $scope.classesWithoutProduct);

            if ($scope.classes.length === 0) {
                $scope.phase.assignments.content = STATE.allHidden;

            } else if (!hasAtLeastOneStudent && Permissions.hasPermission('add_student_in_SIS')) {

                $scope.phase.assignments.content = STATE.mustAddStudentInSIS;

                if (!$scope.currentUser.getAttribute('federatedUser.noStudents.info.seen') &&
                    $location.path().search('/welcome') !== 0) {
                    /*
                       To set the order in case the Teacher has no classes.
                       The modal for no classes will be shown first and then
                       the modal for no student will be shown.
                       Also, fix for issue where /home is called before /welcome and
                       so unwanted modal appears in welcome page.
                    */

                    if (!hasAtLeastOneClassWithProduct) {
                        //The FederatedUser has all classes which don't associate with any product, but has not student.
                        $scope.showModalFederatedUserNoStudentAndAllClassesWithoutProduct();
                    } else {
                        /*
                            The FederatedUser has at least one class which associate with one product, but has not
                            any student.
                        */
                        $scope.showModalFederatedUserHasClassesWithoutStudent();
                    }

                }
            } else if ($scope.assignmentsCreated && $scope.classes.length > 0) {
                $scope.phase.assignments.content = STATE.complete;
            } else if (!hasAtLeastOneClassWithProduct && $location.path().search('/welcome') !== 0 &&
                !$scope.currentUser.getAttribute('federatedUser.noAssociatedPrograms.info.seen') &&
                $scope.currentUser.isFederatedUser) {
                /*
                    The FederatedUser has all classes which don't associate with any product,
                    but has at least one student.
                */
                $scope.showModalFederatedUserALLClassesWithoutProduct();
            }

            switch ($scope.phase.assignments.content) {
                case STATE.allHidden:
                    if (Permissions.hasPermission('create_class')) {
                        $scope.phase.assignments.quickLink = STATE.create;
                    }
                    break;

                case STATE.noAssignment:
                    $scope.phase.assignments.quickLink = STATE.findItems;
                    break;

                case STATE.mustAddStudentInSIS:
                    $scope.phase.assignments.quicklink = STATE.none;
                    break;

                case STATE.complete:
                    if ($scope.classes.length === 1) {
                        $scope.phase.assignments.quickLink = STATE.oneClass;
                    } else if ($scope.classes.length > 1) {
                        $scope.phase.assignments.quickLink = STATE.manyClasses;
                    } else {
                        $log.error('home.teacher.data.ctrl: should not have negative classes length');
                    }
                    break;
            }
        });

        $scope.more = function(e) {
            e.preventDefault();
            e.stopPropagation();

            switch ($scope.phase.assignments.quickLink) {
                case STATE.create:
                    $location.path('/classes/create');
                    break;

                case STATE.oneClass:
                    $location.path(['/data', $scope.classes[0].classId, 'overview'].join('/'));
                    break;

                case STATE.findItems:
                    $location.path('/program');
                    break;

                default:
                    $location.path('/data');
                    break;
            }
        };

        $scope.open = function(e, roster) {
            e.preventDefault();
            e.stopPropagation();
            $location.path(['/data', roster.classId, 'overview'].join('/'));
        };
    }
]);
