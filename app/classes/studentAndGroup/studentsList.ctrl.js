angular.module('RealizeApp')
    .controller('StudentListCtrl', [
        '$scope',
        '$log',
        '$timeout',
        '$interval',
        'Permissions',
        'ClassRosterData',
        'Modal',
        '$q',
        'User',
        'lwcI18nFilter',
        'InlineAlertService',
        '$location',
        'ClassRoster',
        'contentRowModal',
        'EarlyLearnerService',
        'AlertService',
        'Analytics',
        'GOOGLE_CLASSROOM',
        'PARTIALS_PATHS',
        'googleClassroomService',
        'locationUtilService',
        'penpalService',
        function($scope, $log, $timeout, $interval, Permissions, ClassRosterData, Modal, $q, User, lwcI18nFilter,
            InlineAlertService, $location, ClassRoster, contentRowModal, EarlyLearnerService, AlertService, Analytics,
                 GOOGLE_CLASSROOM, PARTIALS_PATHS, googleClassroomService, locationUtilService, penpalService) {
            'use strict';

            $scope.students = ClassRosterData.students;
            var promise;

            $scope.sendPenpalEvent = function(action, payload) {
                if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                    penpalService.connectToParent().then(function(connection) {
                        connection.parent.exec(action, payload);
                    });
                }
            };

            $scope.$on('$viewContentLoaded', function() {
                $timeout(function() {
                    if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                        var body = document.body,
                            html = document.documentElement;
                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight);
                        var payload = { resize_height: height };
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec('RESIZE_PAGE', payload);
                        });
                    }
                }, 1000);
            });

            _.each($scope.students, function(student) {
                student.canRemove = true;
                student.removed = false;
            });

            $scope.getTheme = function(student) {
                return student.userAttributes['profile.learningExperience'];
            };

            $scope.stopInterval = function() {
                $interval.cancel(promise);
            };

            $scope.hasPermission = Permissions.hasPermission;
            $scope.federatedStudentAccountAlert = {
                showAlert: true,
                title: lwcI18nFilter('federatedUser.studentList.alert.title'),
                description: lwcI18nFilter('federatedUser.studentList.alert.description1') + '<br />' +
                lwcI18nFilter('federatedUser.studentList.alert.description2'),
                closeFn: function() {
                    $scope.federatedStudentAccountAlert.showAlert = false;
                }
            };

            $scope.shouldDisplayResetPasswordLink = function() {
                return (!$scope.currentUser.isFederatedUser && !$scope.isGoogleClass) ||
                    ($scope.isGoogleClass);
            };

            $scope.studentsAndGroupOptionsTemplate = PARTIALS_PATHS.studentsAndGroupOptions;
            $scope.isGoogleClass = (ClassRosterData.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM ||
                ClassRosterData.googleLinkedClass);
            $scope.isGoogleLinkedClass = ClassRosterData.googleLinkedClass;
            if ($scope.isGoogleClass) {
                var closeDelayModal = function() {
                    $scope.showStudentDelayMsg = true;
                    return contentRowModal.deactivate();
                };
                var okButton = {
                    label: lwcI18nFilter('global.action.button.ok'),
                    action: function() {
                        closeDelayModal();
                    },
                    className: 'button-cancel',
                    ariaLabel: lwcI18nFilter('global.action.button.ok'),
                    disabled: false,
                };
                var buttons = [
                    okButton,
                ];
                $scope.stopInterval();
                promise = $interval(function() {
                    googleClassroomService.getClassProcessingStatus($scope.currentRoster.classId).then(
                        function(response) {
                        if (response.data.getClassProgress[0]
                            .courseProgress === GOOGLE_CLASSROOM.SYNC_COMPLETED) {
                            if ($scope.isSyncInProgress) {
                                ClassRoster.get({
                                    noCachedData: true,
                                    classId: $scope.currentRoster.classId,
                                })
                                .then(function(roster) {
                                    $scope.students = roster.students;
                                    $scope.isSyncInProgress = false;
                                    $scope.showStudentDelayMsg = false;
                                    closeDelayModal();
                                    $scope.stopInterval();
                                }, function() {
                                    return $q.reject('error getting roster! ' + $scope.currentRoster.classId);
                                });
                            } else {
                                $scope.stopInterval();
                            }
                        } else {
                            if (!$scope.isSyncInProgress && !$scope.showStudentDelayMsg) {
                                contentRowModal.activate({
                                    cssClass: 'modal__contentRowModal studentListDelay__modal',
                                    heading: lwcI18nFilter('studentList.modal.header'),
                                    description: lwcI18nFilter('studentList.modal.body'),
                                    buttons: buttons,
                                    closeButton: true,
                                    overlayActive: true,
                                    closeAction: function() {
                                        closeDelayModal();
                                    },
                                });
                            }
                            $scope.isSyncInProgress = true;
                        }
                    });
                }, 5000);
            }
            $scope.redirectToGoogleClassroom = function() {
                googleClassroomService.redirectToGoogleClass($scope.currentRoster.classId,
                    $scope.currentRoster.rosterSource);
            };

            $scope.getStudentConsent = function(student) {
                return student.userAttributes.googleConsentProvided;
            };

            $scope.edit = function(e, student) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                var modalScope = $scope.$new(true);

                var onClose = function() {
                    modalScope.isEdited = false;
                    if (modalScope.isPopupOpen) {
                        $scope.sendPenpalEvent('CHANGES_SAVED', {});
                    }
                    modalScope.$destroy();
                };

                var setUnsavedChanges = function() {
                    modalScope.isEdited = false;
                    var payload = { hasUnsavedChanges: false };
                    $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                    if (modalScope.isPopupOpen) {
                        $scope.sendPenpalEvent('CHANGES_SAVED', {});
                    }
                };

                modalScope.student = angular.copy(student);
                modalScope.isEdited = false;
                modalScope.isPopupOpen = false;

                modalScope.cancel = function() {
                    setUnsavedChanges();
                    Modal.hideDialog();
                    onClose();
                };

                modalScope.save = function() {
                    if (modalScope.editStudentForm.$invalid) {
                        modalScope.isInProgress = false;
                        return;
                    }

                    modalScope.student.$update().then(function() {
                        // after saved, then update names for view
                        modalScope.student.$updateNames();
                        var payload = { hasUnsavedChanges: false };
                        $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        angular.copy(modalScope.student, student);
                        setUnsavedChanges();
                        Modal.hideDialog();

                        InlineAlertService.addAlert(
                            student.userId,
                            {
                                type: 'success',
                                msg:[
                                    '<strong>',
                                    lwcI18nFilter('studentList.successNotification.studentEdited.title'),
                                    '</strong> ',
                                    lwcI18nFilter('studentList.successNotification.studentEdited.message')
                                ].join('')
                            }
                        );

                        $scope.studentEditedSuccess = true;

                        /**
                         * now we clear the ClassRoster cache so other classes will pull in fresh students
                         * todo: maybe create a student user cache that stores all students and classes so we can
                         * clear only classes that have this student?
                         */
                        ClassRoster.clearClassRosterCache();
                        onClose();
                    }).catch(function(response) {
                        // todo: notification?
                        $log.error('Error updating student!', response);
                        setUnsavedChanges();
                        Modal.hideDialog();
                        onClose();
                    });
                };

                Modal.showDialog('templates/partials/student_edit.html', modalScope);
                window.addEventListener('message', function(event) {
                    if (event.data === 'SAVE_CHANGES') {
                        modalScope.isPopupOpen = true;
                        modalScope.isInProgress = true;
                        modalScope.isEdited = false;
                        modalScope.save();
                    }
                });
                modalScope.$on('modal:shown', function() {
                    modalScope.$watch('editStudentForm.$dirty', function(value) {
                        modalScope.isEdited = value;
                        if (value && modalScope.editStudentForm.$valid) {
                            var payload = { hasUnsavedChanges: true };
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    }, true);

                    modalScope.$watch('editStudentForm.$invalid', function() {
                        if (modalScope.editStudentForm.$invalid && modalScope.isEdited) {
                            var payload = { hasUnsavedChanges: false };
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    });

                    modalScope.$watch('editStudentForm.$valid', function() {
                        if (modalScope.editStudentForm.$valid && modalScope.isEdited) {
                            var payload = {hasUnsavedChanges: true};
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    });
                });
            };

            $scope.resetPasswordSuccess = function(editedStudentId) {
                $scope.passwordResetSuccess = true;

                InlineAlertService.addAlert(
                    editedStudentId,
                    {
                        type: 'success',
                        msg:[
                            '<strong>',
                            lwcI18nFilter('studentList.successNotification.passwordReset.title'),
                            '</strong> ',
                            lwcI18nFilter('studentList.successNotification.passwordReset.message')
                        ].join('')
                    }
                );
            };

            $scope.$on('addStudentModal.studentAdded', function(ev, student) {
                $scope.studentAddedSuccess = true;
                InlineAlertService.addAlert(
                    student.userId,
                    {
                        type: 'success',
                        msg:[
                            '<strong>',
                            lwcI18nFilter('studentList.successNotification.studentAdded.title'),
                            '</strong> ',
                            lwcI18nFilter('studentList.successNotification.studentAdded.message')
                        ].join('')
                    }
                );
            });

            $scope.$on('$routeChangeStart', function() {
                // clear any pending removal students because the roster is stored in rootscope
                ClassRosterData.students = $.Enumerable.From(ClassRosterData.students)
                    .Where('$.canUndoRemove !== true').ToArray();
                ClassRosterData.studentIds = $.Enumerable.From(ClassRosterData.students).Select('$.userId').ToArray();

            });

            $scope.remove = function(e, student) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                student.beingRemoved = true;

                ClassRosterData.$removeStudents(student.userId, function() {
                    // removed successfully from class roster
                    student.canUndoRemove = true;
                    student.removed = true;
                    student.beingRemoved = false;
                });
            };

            $scope.undoRemove = function(e, student) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                student.canRemove = false;

                ClassRosterData.$addStudents(student.userId, function() {
                    student.canUndoRemove = false;
                    student.removed = false;
                    student.canRemove = true;
                });
            };

            // students list variables for manage students mode
            var originalGroup, checked, unchecked;

            $scope.$on('manageStudentsMode', function(event, group) {
                $scope.manageStudentsMode = true;
                $scope.managedGroup = group;

                // setup checkboxes
                angular.forEach($scope.students, function(student) {
                    student.checked = $.Enumerable.From(group.$getMembers(ClassRosterData.classId).studentIds)
                            .IndexOf(student.userId) >= 0;
                });

                originalGroup = $.Enumerable.From($scope.students).Where('$.checked').ToArray();
            });

            $scope.checkboxChangedFor = function(student) {
                student.isSelected = student.checked;
                student.beingRemoved = !student.checked;
            };

            $scope.$watch('students', function() {
                _.each($scope.students, function(student) {
                    if (angular.isUndefined(student.canRemove)) {
                        student.canRemove = true;
                    }
                });

                if (!$scope.manageStudentsMode) { return; }

                checked = $.Enumerable.From($scope.students).Where('$.checked').ToArray();
                unchecked = $.Enumerable.From($scope.students).Where('!($.checked)').ToArray();

                if (checked.length > 0) {
                    $scope.managedGroup.$addStudents(ClassRosterData.classId, checked);
                }
                if (unchecked.length > 0) {
                    $scope.managedGroup.$removeStudents(ClassRosterData.classId, unchecked);
                }

            }, true);

            $scope.cancel = function() {
                var unsaved = _.reject(checked, function(student) {
                    return _.find(originalGroup, function(s) {
                        return s.userId === student.userId;
                    });
                });
                var restored = _.filter(unchecked, function(student) {
                    return _.find(originalGroup, function(s) {
                        return s.userId === student.userId;
                    });
                });

                $scope.managedGroup.$removeStudents(ClassRosterData.classId, unsaved);
                $scope.managedGroup.$addStudents(ClassRosterData.classId, restored);
                $scope.$broadcast('manageStudentsCanceled');
                $scope.manageStudentsMode = false;

                angular.forEach($scope.students, function(student) {
                    student.isSelected = student.beingRemoved = false;
                    student.canRemove = true;
                });
            };

            $scope.save = function() {
                if (!$scope.manageStudentsMode) { return; }

                $scope.managedGroup.$saveMembers(ClassRosterData.classId).then(function(response) {
                    // emit event
                    $log.log('success saving group', response);
                    $scope.groupSaveSuccess = true;
                    $scope.$broadcast('manageStudentsCompleted');
                    $scope.manageStudentsMode = false;

                    angular.forEach($scope.students, function(student) {
                        if (student.isSelected) {
                            InlineAlertService.addAlert(
                                student.userId,
                                {
                                    type: 'success',
                                    msg:[
                                        '<strong>',
                                        lwcI18nFilter('studentList.successNotification.studentAdded.title'),
                                        '</strong> ',
                                        lwcI18nFilter('studentList.successNotification.studentAdded.message')
                                    ].join('')
                                }
                            );
                        }

                        if (student.beingRemoved) {
                            InlineAlertService.addAlert(
                                student.userId,
                                {
                                    type: 'remove',
                                    msg:[
                                        '<strong>',
                                        lwcI18nFilter('studentList.successNotification.studentRemoved.title'),
                                        '</strong> ',
                                        lwcI18nFilter('studentList.successNotification.studentRemoved.message')
                                    ].join('')
                                }
                            );
                        }

                        student.isSelected = student.beingRemoved = false;
                        student.canRemove = true;
                    });
                }, function(err) {
                    // display errors?
                    $log.error('error saving group', err);
                    return;
                });
            };

            $scope.actionFor = function(student) {
                return student.checked ? 'selected' : 'remove';
            };

            $scope.navigationFallback = '/classes';

            if (AlertService.alertIsSet()) {
                $scope.alertDetails = AlertService.alerts[0];
                $scope.alertIsSet = AlertService.alertIsSet();
            }

            $scope.goToChangeTheme = function() {
                EarlyLearnerService.gotoChangeThemePage();
            };

            $scope.displayShowGroups = function() {
                return (!($scope.students.length === 0 || $scope.manageStudentsMode) && !$scope.isGoogleClass);
            };

            $scope.displayAddStudent = function() {
                return $scope.hasPermission('add_student') && !$scope.isGoogleClass;
            };

            $scope.displayRemoveStudent = function(student) {
                return student.canRemove && !$scope.isGoogleClass;
            };

            $scope.addAnalyticsShowGroups = function() {
                Analytics.track('track.action', {
                    category: 'Classes',
                    action: 'Students & Groups',
                    label: 'Students & Groups - Show groups'
                });
            };

            $scope.addAnalyticsAddStudent = function() {
                Analytics.track('track.action', {
                    category: 'Classes',
                    action: 'Students & Groups',
                    label: 'Students & Groups - Add student to class'
                });
            };

            $scope.isNoGoogleClassWithNoStudent = function() {
                return $scope.students.length === 0 && !$scope.isGoogleClass;
            };

            $scope.isGoogleClassWithNoStudent = function() {
                return $scope.students.length === 0 && $scope.isGoogleClass &&
                    !($scope.currentUser.getAttribute('isAutoRostered') &&
                    $scope.currentUser.getAttribute('isClassLinkingEnabled'));
            };

            $scope.isLinkedGoogleAutoPlusOrgClassWithNoStudent = function() {
                return $scope.students.length === 0 && $scope.isGoogleLinkedClass &&
                    $scope.currentUser.getAttribute('isAutoRostered') &&
                    $scope.currentUser.getAttribute('isClassLinkingEnabled');
            };

            $scope.isImportedGoogleAutoPlusOrgClassWithNoStudent = function() {
                return $scope.students.length === 0 && $scope.isGoogleClass &&
                    !$scope.isGoogleLinkedClass &&
                    $scope.currentUser.getAttribute('isAutoRostered') &&
                    $scope.currentUser.getAttribute('isClassLinkingEnabled');
            };

            $scope.isGoogleAutoPlusOrgClassWithStudent = function() {
                return $scope.students && $scope.students.length > 0 && $scope.isGoogleClass &&
                    !$scope.isGoogleLinkedClass &&
                    $scope.currentUser.getAttribute('isAutoRostered') &&
                    $scope.currentUser.getAttribute('isClassLinkingEnabled');
            };

            $scope.$on('$destroy', function() {
                $scope.stopInterval();
            });

            $scope.showSubNavigation = function() {
                return !locationUtilService.isDeeplinkStudentAndGroupTabActive();
            };
        }
    ]);
