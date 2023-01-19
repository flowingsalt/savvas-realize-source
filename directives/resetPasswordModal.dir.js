angular.module('RealizeDirectives')
    .directive('resetPasswordModal', [
        '$log',
        'Modal',
        'TEMPLATE_PATH',
        '$rootScope',
        'User',
        'locationUtilService',
        'penpalService',
        function($log, Modal, templatePath, $rootScope, User, locationUtilService, penpalService) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var clickHandler = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var sendPenpalEvent = function(action, payload) {
                            if (locationUtilService.isDeeplinkStudentAndGroupTabActive()) {
                                penpalService.connectToParent().then(function(connection) {
                                    connection.parent.exec(action, payload);
                                });
                            }
                        };

                        var modalScope = scope.$new(true),
                            resetType = attrs.resetType, // 'self' | 'student'
                            currentUser = $rootScope.currentUser,
                            onSuccess = scope.$eval(attrs.onSuccess),
                            onClose = function() {
                                modalScope.$destroy();
                                modalScope.isEdited = false;
                                sendPenpalEvent('UNSAVED_CHANGES', {hasUnsavedChanges: false});
                            },
                            saveSuccess = function(studentId) {
                                sendPenpalEvent('UNSAVED_CHANGES', {hasUnsavedChanges: false});
                                if (modalScope.isPopupOpen) {
                                    sendPenpalEvent('CHANGES_SAVED', {});
                                }
                                Modal.hideDialog();
                                onSuccess(studentId);
                                onClose();
                            },
                            saveError = function(err) {
                                $log.log(err);
                                modalScope.resetPassword.currentPassword.$setValidity('password', false);
                                modalScope.isInProgress = false;
                                if (modalScope.isPopupOpen) {
                                    sendPenpalEvent('CHANGES_SAVED', {});
                                }
                            };

                        if (!angular.isDefined(onSuccess) || !angular.isFunction(onSuccess)) {
                            onSuccess = angular.noop;
                        }

                        modalScope.isPopupOpen = false;
                        modalScope.isEdited = false;
                        modalScope.isResetStudent = resetType === 'student';
                        modalScope.forgotPasswordUrl = window.forgotPasswordUrl + '?service=' + window.location;

                        if (!modalScope.isResetStudent) {
                            modalScope.editUser = currentUser;
                        } else {
                            modalScope.editUser = scope.$eval(attrs.student);
                            if (!modalScope.editUser) {
                                $log.error('Cannot find student', attrs.student);
                            }
                        }

                        modalScope.cancel = function() {
                            Modal.hideDialog();
                            onClose();
                        };

                        modalScope.isResetDisabled = function(resetPassword) {
                            return resetPassword.$pristine || resetPassword.$invalid || modalScope.isInProgress;
                        };

                        modalScope.save = function() {
                            modalScope.isInProgress = true;

                            if (modalScope.resetPassword.$invalid) {
                                modalScope.isInProgress = false;
                                return;
                            }

                            if (!modalScope.isResetStudent) {
                                User.updatePasswordForUser(
                                        currentUser,
                                        modalScope.currentPassword,
                                        modalScope.password
                                    ).then(saveSuccess, saveError);
                            } else {
                                var studentUser = modalScope.editUser,
                                    studentId = studentUser.userId;

                                if (studentId) {
                                    User.updatePasswordForUser(
                                            studentUser,
                                            modalScope.currentPassword,
                                            modalScope.password
                                        ).then(
                                            function() {
                                                saveSuccess(studentId);
                                            },
                                            saveError
                                        );
                                } else {
                                    $log.error('Failed to reset password for student', studentUser);
                                }
                            }
                        };

                        Modal.showDialog('templates/partials/reset_password.html', modalScope);

                        window.addEventListener('message', function(event) {
                            if (event.data === 'SAVE_CHANGES') {
                                modalScope.isInProgress = true;
                                modalScope.isPopupOpen = true;
                                modalScope.save();
                            }
                        });

                        modalScope.$on('modal:shown', function() {
                            modalScope.$watch('resetPassword.$dirty', function(value) {
                                modalScope.isEdited = value;
                                if (value && modalScope.resetPassword.$valid) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: true });
                                }
                            }, true);

                            modalScope.$watch('resetPassword.$valid', function(value) {
                                if (value && modalScope.isEdited) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: true });
                                }
                            }, true);

                            modalScope.$watch('resetPassword.$invalid', function(value) {
                                if (value && modalScope.isEdited) {
                                    sendPenpalEvent('UNSAVED_CHANGES', { hasUnsavedChanges: false });
                                }
                            }, true);
                        });
                        // bring us back into angular-land
                        scope.$applyAsync();
                    };

                    el.on('click', clickHandler);
                }
            };
        }
    ]);
