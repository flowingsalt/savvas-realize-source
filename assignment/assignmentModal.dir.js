// assignmentModal.js (Derived from modalClick.js)

/* Possible modals:
    Zero Classes
    Zero Students
    Assessment zero questions
    create/edit assignment modal
    missing item
*/

angular.module('Realize.assignment.modal', [
    'ModalServices',
    'RealizeDataServices', //TODO: replace with specific services this used
    'Realize.content',
    'Realize.assessment.assessmentDataService',
    'Realize.constants.mediaType'
])
    .directive('assignmentModal', [
        '$log',
        'Modal',
        '$location',
        'ClassRoster',
        'Content',
        'Assessment',
        'MEDIA_TYPE',
        'ClassUtil',
        'Permissions',
        '$rootScope',
        'featureManagementService',
        'locationUtilService',
        'penpalService',
        function($log, Modal, $location, ClassRoster, Content, Assessment, MEDIA_TYPE,
                ClassUtil, Permissions, $rootScope, featureManagementService, locationUtilService, penpalService) {
            'use strict';

            var linkClicked = false; // Prevent double click (2.1 ONLY FIX)

            var sendPenpalEvent =  function(action, payload) {
                if (locationUtilService.isDeeplinkDiscussTabActive()) {
                    penpalService.connectToParent().then(function(connection) {
                        connection.parent.exec(action, payload);
                    });
                }
            };

            var showCreateModeZeroClassesDialog = function(cancelCallBack) {
                var title = 'assignmentForm.zeroState.noClasses.title',
                    body = 'assignmentForm.zeroState.noClasses.message',
                    buttons = {
                        OK: {
                            title: 'assignmentForm.zeroState.noClasses.action.createClass',
                            handler: function() {
                                $location.path('classes/create');
                            },
                            isDefault: true
                        },
                        CANCEL: {
                            title: 'assignmentForm.zeroState.noClasses.action.cancel',
                            handler: cancelCallBack
                        }
                    };

                Modal.simpleDialog(title, body, buttons, {
                    id: 'assignModalZeroClassStateModal'
                });
                linkClicked = false;
            };

            var showCreateModeZeroStudentsDialog = function(cancelCallBack) {
                var title = 'assignmentForm.zeroState.noStudents.title',
                    body = 'assignmentForm.zeroState.noStudents.message',
                    buttons = {
                        OK: {
                            title: 'assignmentForm.zeroState.noStudents.action.goToClass',
                            handler: function() {
                                $location.path('classes');
                            },
                            isDefault: true
                        },
                        CANCEL: {
                            title: 'assignmentForm.zeroState.noStudents.action.cancel',
                            handler: cancelCallBack
                        }
                    };

                Modal.simpleDialog(title, body, buttons, {
                    id: 'assignModalZeroStudentStateModal'
                });
                linkClicked = false;
            };

            var showZeroStudentsDialogForFederatedUser = function() {
                var title = 'federatedUser.assignmentForm.zeroState.noStudents.title',
                    body = 'federatedUser.assignmentForm.zeroState.noStudents.message';

                Modal.simpleDialog(title, body, null, {
                    id: 'assignModalZeroStudentStateFederatedUser'
                });
                linkClicked = false;
            };

            var showZeroHiddenClassesForFederatedUser = function() {
                var title = 'federatedUser.assignmentForm.zeroState.noClasses.title',
                    body = 'federatedUser.assignmentForm.zeroState.noClasses.message';

                Modal.simpleDialog(title, body, null, {
                    id: 'assignModalZeroHiddenClassesStateFederatedUser'
                });
                linkClicked = false;
            };

            var showCreateModeZeroQuestionsDialog = function() {
                var title = 'assignmentForm.zeroState.noQuestions.title',
                    body = 'assignmentForm.zeroState.noQuestions.message';
                Modal.simpleDialog(title, body, null, {
                    id: 'assignModalZeroQuestionStateModal'
                });
                linkClicked = false;
            };

            var showMissingItemDialog = function() {
                var title = 'assignmentForm.zeroState.missingItem.title',
                    body = 'assignmentForm.zeroState.missingItem.message';
                Modal.simpleDialog(title, body, null, {
                    id: 'assignModalMissingItemModal'
                });
                linkClicked = false;
            };

            var showBrokenItemDialog = function() {
                var title = 'assignmentForm.zeroState.brokenItem.title',
                    body = 'assignmentForm.zeroState.brokenItem.message';
                Modal.simpleDialog(title, body, null, {
                    id: 'assignModalBrokenItemModal'
                });
                linkClicked = false;
            };

            var showNoProgramDialog = function(ok, cancel) {
                var title = 'noPrograms.modal.assignments.heading',
                    body = 'noPrograms.modal.assignments.message',
                    btns = {
                        OK: {
                            title: 'noPrograms.modal.action.ok',
                            handler: ok,
                            isDefault: true
                        },
                        CANCEL: {
                            title: 'noPrograms.modal.action.cancel',
                            handler: cancel
                        }
                    };

                Modal.simpleDialog(title, body, btns, {
                    id: 'assignModalNoPrograms'
                });
                linkClicked = false;
            };

            var buildMultiSelectRequest = function(checkedItems) {
                // list of selected item (item Id and version)
                return _.map(checkedItems, function(checkedItem) {
                    return {
                        itemUuid: angular.isDefined(checkedItem.item.originalEquellaItemId) ?
                            checkedItem.item.originalEquellaItemId : checkedItem.item.id,
                        itemVersion: checkedItem.item.version
                    };
                });
            };

            return {
                link: function($scope, el, attrs) {
                    // we don't need to create a child $scope every time this link is clicked, only once
                    var modalScope = null,
                        modalClickHandler,
                        invokeEventHandler,
                        isPopupOpen = false;

                    modalClickHandler = function(e, contentItem, assignmentObj, multiSelectItems) {
                        if (linkClicked) {
                            return false;
                        }

                        if (e.preventDefault) { e.preventDefault(); }
                        if (e.stopPropagation) { e.stopPropagation(); }

                        var user = $rootScope.currentUser;

                        var item = $scope.$eval(attrs.assignmentModal) || contentItem || assignmentObj;
                        var multiSelectRequest = $scope.$eval(attrs.contentJson);
                        var checkedItems = $scope.$eval(attrs.checkedItems);
                        if (multiSelectItems) {
                            checkedItems = multiSelectItems;
                            multiSelectRequest = buildMultiSelectRequest(multiSelectItems);
                        }

                        var onSaveAssignment = function() {
                            var payload = {hasUnsavedChanges: false};
                            sendPenpalEvent('UNSAVED_CHANGES', payload);
                            if (isPopupOpen) {
                                sendPenpalEvent('CHANGES_SAVED', {});
                            }
                            $scope.$eval(attrs.onSaveAssignment);
                        };

                        var onCancelAssignment = function() {
                            var payload = {hasUnsavedChanges: false};
                            sendPenpalEvent('UNSAVED_CHANGES', payload);
                            $scope.$eval(attrs.onCancelAssignment);
                        };

                        var checkClassAndStudents = function() {
                            // Get classroster
                            ClassRoster.get().then(function(rosters) {
                                var hasAtLeastOneStudent = ClassUtil.hasAtLeastOneStudentInRosters(rosters),
                                    hasNoClass = rosters.length === 0,
                                    classesCreated = user.getAttribute('classes.created'),
                                    hasCreateClassPermission = Permissions.hasPermission('create_class');

                                // Zero Class state modal
                                if (hasNoClass && hasCreateClassPermission) {
                                    showCreateModeZeroClassesDialog(onCancelAssignment);
                                } else if (hasNoClass && classesCreated && !hasCreateClassPermission) {
                                    showZeroHiddenClassesForFederatedUser();
                                } else if (!hasAtLeastOneStudent && hasCreateClassPermission) {
                                    showCreateModeZeroStudentsDialog(onCancelAssignment);
                                } else if (!(hasAtLeastOneStudent || hasCreateClassPermission)) {
                                    showZeroStudentsDialogForFederatedUser();
                                } else {
                                    modalScope = $scope.$new(true);
                                    modalScope.item = item;
                                    modalScope.mode = attrs.mode;
                                    modalScope.assigntype = attrs.assigntype;
                                    modalScope.classId = attrs.classId;
                                    modalScope.selectedStudents =  $scope.$eval(attrs.selectedStudents);
                                    modalScope.useBannerAlert = $scope.$eval(attrs.useBannerAlert);
                                    modalScope.classes = rosters;
                                    modalScope.multiSelectRequest = multiSelectRequest;
                                    modalScope.checkedItems = checkedItems;
                                    modalScope.isEdited = false;
                                    modalScope.close = function(onCancel) {
                                        Modal.hideDialog();
                                        if (onCancel) {
                                            $rootScope.$broadcast('assignment.cancel.status');
                                            onCancelAssignment();
                                        } else {
                                            onSaveAssignment();
                                        }
                                        modalScope.isEdited = false;
                                        modalScope.$destroy();
                                    };

                                    // update assignType attribute for playlist multiselect assignment
                                    if (featureManagementService.isMyLibraryViewerEnabled() &&
                                        assignmentObj && assignmentObj.playlistMultiSelect) {
                                        modalScope.assigntype = assignmentObj.playlistMultiSelect;
                                    }

                                    // hide assign success message when user again opens it ??
                                    modalScope.$emit('assignmentModal.alert.toggle', {
                                        show: false
                                    });

                                    window.addEventListener('message', function(event) {
                                        if (event.data === 'SAVE_CHANGES') {
                                            isPopupOpen = true;
                                            onSaveAssignment();
                                        }
                                    });

                                    // launch modal
                                    Modal.showDialog('templates/assignment/assignmentModal.html', modalScope);
                                    modalScope.$on('modal:shown', function() {
                                        modalScope.$watch('assignmentForm.$dirty', function(value) {
                                            modalScope.isEdited = value;
                                            if (value && modalScope.assignmentForm.$valid) {
                                                var payload = { hasUnsavedChanges: true };
                                                sendPenpalEvent('UNSAVED_CHANGES', payload);
                                            }
                                        }, true);

                                        modalScope.$watch('assignmentForm.$invalid', function() {
                                            if (modalScope.assignmentForm.$invalid && modalScope.isEdited) {
                                                var payload = { hasUnsavedChanges: false };
                                                $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                                            }
                                        });

                                        modalScope.$watch('assignmentForm.$valid', function() {
                                            if (modalScope.assignmentForm.$valid && modalScope.isEdited) {
                                                var payload = {hasUnsavedChanges: true};
                                                $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                                            }
                                        });
                                    });
                                    linkClicked = false;
                                }

                            });
                        };

                        var checkContent = function() {
                            if (!item.isExternalResource() && item.$isTest()) {
                                item = item.$getDefaultVersion();
                                Assessment.getInfo(item.id, item.version).then(function(assessment) {
                                    if (assessment.questionCount === 0) {
                                        showCreateModeZeroQuestionsDialog();
                                    } else {
                                        checkClassAndStudents();
                                    }
                                }, function(e) {
                                    $log.error(e);
                                    linkClicked = false;
                                    showBrokenItemDialog();
                                });
                            } else {
                                checkClassAndStudents();
                            }
                        };

                        var isRestrictedMediaType = function(mediaType) {
                            var restrictedMediaTypes = [
                                MEDIA_TYPE.DISCUSSION_PROMPT,
                                MEDIA_TYPE.PLAYLIST,
                            ];
                            var indexOfMediaTypeInRestrictedMedia =
                                restrictedMediaTypes.findIndex(function(restrictedMediaType) {
                                    return restrictedMediaType.toLowerCase() === mediaType.toLowerCase();
                                });
                            return indexOfMediaTypeInRestrictedMedia > -1;
                        };

                        var checkUserPrograms = function(callback) {
                            if (!callback) { callback = angular.noop; }
                            if (user.showNoProgramModal(true)) {
                                showNoProgramDialog(
                                    function() {
                                        var classes = user.getAttribute('classes.withoutPrograms');
                                        user.setAttribute('hideNoProgramModal', true);

                                        if (classes.length > 1) {
                                            $location.path('classes');
                                        } else {
                                            $location.path(['classes', classes[0], 'manage'].join('/'));
                                        }
                                    },
                                    function() {
                                        user.setAttribute('hideNoProgramModal', true);
                                        callback();
                                    }
                                );
                                $scope.$applyAsync();
                            } else {
                                callback();
                            }
                        };

                        if (attrs.assigntype === 'multiselect' && item.contentItems.length > 1) {
                            checkClassAndStudents();
                        } else if (item.mediaType === 'BROKEN' ||
                            (attrs.mode === 'create' && !isRestrictedMediaType(item.mediaType) &&
                            (!item.attachments || item.attachments.length === 0) &&
                            item.contribSource !== 'My Uploads')) {
                            checkUserPrograms(showBrokenItemDialog);
                        } else {
                            linkClicked = true;

                            // Editing assignment object, no need to check roster
                            if (attrs.mode === 'edit') {
                                var assignment = $scope.$eval(attrs.assignmentModal) || contentItem || assignmentObj;
                                if (assignment.missingContentItem) {
                                    showMissingItemDialog();
                                } else {
                                    modalScope = $scope.$new(true);
                                    modalScope.item = assignment;
                                    modalScope.mode = attrs.mode;
                                    modalScope.isEdited = false;
                                    modalScope.useBannerAlert = $scope.$eval(attrs.useBannerAlert);
                                    modalScope.close = function() {
                                        Modal.hideDialog();
                                        modalScope.isEdited = false;
                                        var payload = { hasUnsavedChanges: false };
                                        sendPenpalEvent('UNSAVED_CHANGES', payload);
                                        modalScope.$destroy();
                                    };

                                    // hide assign success message when user again opens it ??
                                    modalScope.$emit('assignmentModal.alert.toggle', {
                                        show: false
                                    });

                                    // launch modal
                                    Modal.showDialog('templates/assignment/assignmentModal.html', modalScope);
                                    modalScope.$on('modal:shown', function() {
                                        modalScope.$watch('assignmentForm.$dirty', function(value) {
                                            modalScope.isEdited = true;
                                            if (value && locationUtilService.isDeeplinkDiscussTabActive()) {
                                                var payload = { hasUnsavedChanges: true };
                                                sendPenpalEvent('UNSAVED_CHANGES', payload);
                                            }
                                        }, true);
                                    });
                                    linkClicked = false;
                                }
                            } else {
                                checkUserPrograms(checkContent);
                            }
                        }

                        $scope.$applyAsync();
                    };

                    invokeEventHandler = function($event, contentItem, assignmentObj, multiSelectItems) {
                        modalClickHandler($event, contentItem, assignmentObj, multiSelectItems);
                    };

                    el.on('click', modalClickHandler);
                    $scope.$on('assignment_modal.invoke', invokeEventHandler);
                }
            };
        }
    ]
);
