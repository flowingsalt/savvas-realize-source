angular.module('RealizeApp')
    .directive('crStudentGrid', [
        '$log',
        'ClassRoster',
        'Messages',
        'User',
        '$debounce',
        'FormService',
        'KEY_CODES',
        '$timeout',
        '$rootScope',
        '$filter',
        '$document',
        function($log, ClassRoster, Messages, User, $debounce, FormService,
            KEY_CODES, $timeout, $rootScope, $filter, $document) {
            'use strict';

            return {
                restrict: 'A',
                replace: true,
                scope: {
                    students: '=',
                    orgId: '=',
                    addStudentForm: '=',
                    hidePassword: '='
                },

                templateUrl: 'templates/partials/studentGrid.html',

                controller: ['$scope', function($scope) {
                    var forceFieldValidation = function(formObj, field) {
                        if (field[0] !== '$' && !formObj[field].$pristine) {
                            formObj[field].$setViewValue(formObj[field].$modelValue);
                        }
                    };

                    $scope.validUsername = /^[^<>,\s]+$/;

                    $scope.isDemoUser = $rootScope.currentUser.getAttribute('isSelfRegUser');

                    $scope.$watch('orgId', function(orgId) {
                        if (!orgId) {
                            return;
                        }

                        // if the orgId changes, update all students to match
                        _.each($scope.students, function(student) {
                            if (!_.isEmpty(student)) {
                                student.organizationId = orgId;
                                if ($scope.isDemoUser) {
                                    student.userName = $filter('lwcI18n')('demo.autoGenerate.username.placeHolder');
                                }
                            }
                        });
                    });
                    $scope.typeaheadOnSelect = function(selected, index) {
                        $log.log('selected: ', selected, index);
                        var thisStudent = $scope.students[index];

                        // if they did not select an object, basically selected current value in input
                        if (angular.isString(selected)) {
                            // we don't have to worry about the student previously being a rumbe user
                            // because selecting a rumbe user locks down that row
                            thisStudent.$setLastFirst(selected);
                        }

                        // if the selected a dropdown value
                        if (angular.isObject(selected)) {
                            // replace
                            thisStudent.$setLastFirst(selected.lastFirst);
                            thisStudent.userName = selected.userName;
                            thisStudent.userId = selected.userId;
                            thisStudent.disableEdits = true;

                            thisStudent.password = 'password not shown';
                            FormService.forceValidPassword(thisStudent.$form);
                        }

                        $scope.currentFocusedElement = $(':focus');
                    };

                    $scope.getMessage = Messages.getMessage;

                    var searchUsers = function(first, last) {
                        return User.query({
                            firstname: first,
                            lastname: last,
                            organization: $scope.orgId
                        }, true).then(function(response) {
                            var existingStudents = $scope.students;
                            if (existingStudents) {
                                // don't show students that have already been added to class
                                existingStudents = _.filter(existingStudents, function(s) {
                                    return angular.isObject(s);
                                });
                                return _.reject(response, function(student) {
                                    return angular.isDefined(_.findWhere(existingStudents, {
                                        userName: student.userName
                                    }));
                                });
                            }
                            return response;
                        }, function(err) {
                            $log.error('error in student query: ', err);
                            return [];
                        });
                    };

                    var searchcrit = '';

                    function doSearch() {
                        var names = searchcrit.split(','),
                            firstName = names[1],
                            first = firstName && $.trim(firstName).length > 0 ? $.trim(firstName) : undefined,
                            lastName = names[0],
                            last = lastName && $.trim(lastName).length > 0 ? $.trim(lastName) : undefined;

                        // search for students within the roster's org
                        return searchUsers(first, last, $scope.orgId);
                    }

                    $scope.findStudents = function($viewValue) {
                        if ($viewValue && $viewValue.length < 3) {
                            return;
                        }
                        searchcrit = $viewValue;

                        return $debounce(doSearch, 100);
                    };

                    // match template for student search results
                    $scope.matchTmplUrl = 'templates/partials/student_grid_typeaheadMatch.html';

                    $scope.isNextRowAvailable = function(clickEvent) {
                        return $(clickEvent.target).closest('tbody').next().length > 0;
                    };

                    // function for removing a student row from the table
                    $scope.removeStudentRow = function(e, index) {
                        if ($scope.isNextRowAvailable(e)) {
                            $scope.nextFocusedElement = $(e.target).closest('tbody').next().find(':focusable').first();
                        } else {
                            $scope.nextFocusedElement = $(e.target).closest('.students').parent().next()
                                .find(':focusable').first();
                        }
                        var removed = $scope.students.splice(index, 1);
                        $log.log('Removed 1 student from the table!', removed);
                    };

                    $scope.studentNameUpdated = function(student) {
                        student.$setLastFirst(student.$form.studentName.$viewValue);
                        forceFieldValidation(student.$form, 'password');
                    };

                    $scope.getNextRemoveButton = function() {
                        return $($scope.currentFocusedElement).parent().nextAll('.remove').find('a:first');
                    };

                    // to set focus on next remove button when user selects student from student dropdown
                    // by using keyboard instead of mouse
                    var keydownEventHandler = function(event) {
                        if ($scope.currentFocusedElement && event.keyCode === KEY_CODES.TAB) {
                            $timeout(function() {
                                $scope.getNextRemoveButton().focus();
                                $scope.currentFocusedElement = undefined;
                            }, 0);
                        } else if ($scope.nextFocusedElement && event.keyCode === KEY_CODES.TAB) {
                            $timeout(function() {
                                $($scope.nextFocusedElement).focus();
                                $scope.nextFocusedElement = undefined;
                            }, 0);
                        }
                    };
                    $document.on('keydown', keydownEventHandler);
                    $scope.$on('$destroy', function() {
                        $scope.currentFocusedElement = null;
                        $scope.nextFocusedElement = null;
                        $document.off('keydown', keydownEventHandler);
                    });
                }]
            };
        }
    ]);
