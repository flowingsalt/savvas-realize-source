angular.module('RealizeDirectives')
    .directive('addStudentModal', [
        '$log',
        'Modal',
        'Messages',
        '$location',
        '$timeout',
        '$route',
        'User',
        '$rootScope',
        '$filter',
        'locationUtilService',
        'penpalService',
        function($log, Modal, Messages, $location, $timeout, $route, User, $rootScope, $filter,
            locationUtilService, penpalService) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var addStudentModalClickHandler = function(e) {
                        $log.log('add-student-modal CLICK', el);

                        e.preventDefault();
                        e.stopPropagation();

                        var rosterData = scope.currentRoster;
                        var modalScope = scope.$new(true);
                        modalScope.isDemoUser = $rootScope.currentUser.getAttribute('isSelfRegUser');
                        modalScope.className = rosterData.className;
                        modalScope.student = new User({
                            userName: modalScope.isDemoUser ?
                                $filter('lwcI18n')('demo.autoGenerate.username.placeHolder') : '',
                            firstName: '',
                            lastName: '',
                            primaryOrgRole: 'Student',
                            primaryOrgId: rosterData.organizationId,
                            organizationId: rosterData.organizationId,
                            userAttributes: {}
                        });

                        modalScope.$watch('existingStudent', function(student) {
                            var timer;
                            if (!student) {
                                return;
                            }

                            if (angular.isString(student)) {
                                modalScope.student.$setLastFirst(student);
                            } else if (angular.isObject(student)) {
                                student.password = 'password not shown';
                                student.disableEdits = true;
                                modalScope.student = student;
                                timer = $timeout(function() {
                                    // remove validations
                                    angular.forEach(modalScope.addStudentForm.password.$error, function(val, key) {
                                        modalScope.addStudentForm.password.$setValidity(key, true);
                                    });
                                    angular.forEach(modalScope.addStudentForm.userName.$error, function(val, key) {
                                        modalScope.addStudentForm.userName.$setValidity(key, true);
                                    });
                                    modalScope.addStudentForm.userName.$setPristine();
                                    modalScope.addStudentForm.password.$setPristine();
                                    modalScope.isExistingStudent = true;
                                });
                                modalScope.$on('$destroy', function destroy() {
                                    $timeout.cancel(timer);
                                });
                            }
                        });

                        modalScope.isFormInvalid = function(isInProgress) {
                            var isFormInvalid = modalScope.addStudentForm.studentName.$pristine ||
                                modalScope.addStudentForm.userName.$pristine ||
                                modalScope.addStudentForm.password.$pristine ||
                                modalScope.addStudentForm.studentName.$invalid ||
                                modalScope.addStudentForm.userName.$invalid ||
                                modalScope.addStudentForm.password.$invalid ||
                                isInProgress;

                            if (modalScope.isExistingStudent) {
                                isFormInvalid = false;
                            }

                            return isFormInvalid;
                        };

                        modalScope.matchTmplUrl = 'templates/partials/student_add_typeaheadMatch.html';

                        modalScope.findStudents = function($viewValue) {

                            if ($viewValue && $viewValue.length < 3) {
                                return [];
                            }

                            var names = $viewValue.split(','),
                                firstName = names[1],
                                first = firstName && $.trim(firstName).length > 0 ? $.trim(firstName) : undefined,
                                lastName = names[0],
                                last = lastName && $.trim(lastName).length > 0 ? $.trim(lastName) : undefined;

                            // search for students within the roster's org
                            return User.query({
                                firstname: first,
                                lastname: last,
                                organization: rosterData.organizationId
                            }, true).then(
                                function(response) {
                                    //$log.debug(response);
                                    return _.reject(response, function(student) {
                                        return _.find(rosterData.studentIds, function(id) {
                                            return id === student.userId;
                                        });
                                    });
                                }
                            );
                        };

                        var onClose = function() {
                            sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: false });
                            modalScope.$destroy();
                            if (scope.$eval(attrs.reload)) {
                                $route.reload();
                            }
                        };

                        var sendPenpalEvent = function(action, payload) {
                            if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                                penpalService.connectToParent().then(function(connection) {
                                    connection.parent.exec(action, payload);
                                });
                            }
                        };

                        modalScope.cancel = function() {
                            Modal.hideDialog();
                            onClose();
                        };

                        modalScope.save = function() {
                            if (modalScope.addStudentForm.$invalid) {
                                modalScope.isInProgress = false;
                                return;
                            }

                            if (modalScope.student.userId) {
                                // just add to roster
                                rosterData.$addStudents(modalScope.student.userId, function() {
                                    if ($.Enumerable.From(rosterData.students)
                                        .Count('$.userId == \'' + modalScope.student.userId + '\'') <= 0) {
                                        modalScope.student.userAttributes['profile.learningExperience'] =
                                            rosterData.learningExperience;
                                        rosterData.students.push(modalScope.student);
                                    }
                                    scope.$emit('addStudentModal.studentAdded', modalScope.student);
                                    Modal.hideDialog();
                                    onClose();
                                });
                            } else {
                                var onCreate = function() {
                                    // add to class
                                    rosterData.$addStudents(modalScope.student.userId, function() {
                                        if ($.Enumerable.From(rosterData.students)
                                            .Count('$.userId == \'' + modalScope.student.userId + '\'') <= 0) {
                                            rosterData.students.push(modalScope.student);
                                            rosterData.studentIds.push(modalScope.student.userId);
                                        }
                                        scope.$emit('addStudentModal.studentAdded', modalScope.student);
                                        modalScope.student.userAttributes['profile.learningExperience'] =
                                            rosterData.learningExperience;
                                        Modal.hideDialog();
                                        onClose();
                                    });
                                };
                                // create in RUMBA
                                modalScope.student.$save().then(onCreate, onCreate);
                            }
                            sendPenpalEvent('UNSAVED_CHANGES', {hasUnsavedChanges: false});
                            if (modalScope.isPopupOpen) {
                                sendPenpalEvent('CHANGES_SAVED', {});
                            }
                        };

                        window.addEventListener('message', function(event) {
                            if (event.data === 'SAVE_CHANGES') {
                                modalScope.isInProgress = true;
                                modalScope.isPopupOpen = true;
                                modalScope.save();
                            }
                        });

                        Modal.showDialog('templates/partials/student_add.html', modalScope);
                        modalScope.$on('modal:shown', function() {
                            modalScope.$watch('addStudentForm.$dirty', function(value) {
                                if (value && modalScope.addStudentForm.$valid) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: true });
                                }
                            }, true);

                            modalScope.$watch('addStudentForm.$invalid', function(value) {
                                if (value) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: false });
                                }
                            }, true);

                            modalScope.$watch('addStudentForm.$valid', function(value) {
                                if (value) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: true });
                                }
                            }, true);

                        });
                        // bring us back into angular-land
                        scope.$applyAsync();
                    };
                    scope.getMessage = Messages.getMessage;
                    el.on('click', addStudentModalClickHandler);
                }
            };
        }
    ]);
