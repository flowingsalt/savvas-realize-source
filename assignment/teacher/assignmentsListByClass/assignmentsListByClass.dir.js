angular.module('Realize.assignment.listByClass', [
    'components.alert',
    'Realize.analytics',
    'Realize.user.currentUser',
    'Realize.assignment.facadeService',
    'Realize.common.mediaQueryService',
    'Realize.ui.modal.UnsavedChangesModal',
    'rlzComponents.routedComponents.assignments',
    'Realize.common.alerts',
    'Realize.assignment.utilService',
    'rlzComponents.components.googleClassroom.constants',
    'rlzComponents.components.googleClassroom',
    'webStorageModule',
    'rlzComponents.assignmentTelemetryModule',
    'rlzComponents.routedComponents.assignments.constants',
    'Realize.standard.constants',
    'rlzComponents.components.featureManagement'
])
    .directive('assignmentsListByClass', [
        '$log',
        '$rootScope',
        '$timeout',
        '$location',
        '$routeParams',
        '$currentUser',
        'User',
        'AssignmentFacadeService',
        'AssignmentUtil',
        'lwcI18nFilter',
        'MediaQuery',
        'numberFilter',
        'ASSIGNMENT_CONSTANTS',
        'STANDARD_CONSTANTS',
        'UnsavedChangesModal',
        'assignmentHelperService',
        'googleClassroomService',
        'GOOGLE_CLASSROOM',
        'GoogleClassroomConstants',
        'Toast',
        'standardModal',
        'webStorage',
        'assignmentTelemetryService',
        'ASSIGNMENT_TELEMETRY_CONSTANTS',
        'featureManagementService',
        function($log, $rootScope, $timeout, $location, $routeParams, $currentUser, User, AssignmentFacadeService,
             AssignmentUtil, lwcI18nFilter, MediaQuery, numberFilter, ASSIGNMENT_CONSTANTS, STANDARD_CONSTANTS,
             UnsavedChangesModal, assignmentHelperService, googleClassroomService, GOOGLE_CLASSROOM,
             GoogleClassroomConstants, Toast, standardModal, webStorage, assignmentTelemetryService,
             ASSIGNMENT_TELEMETRY_CONSTANTS, featureManagementService) {

            'use strict';

            return {
                scope: {
                    assignmentData: '=',
                    groupData: '=',
                    classRosterData: '=',
                    requestFilter: '=',
                    componentLoading: '=',
                    showTab: '=',
                    assignmentErrorData: '=',
                    clonedAssignmentErrorData: '=',
                    page: '<',
                    editedAssignments: '='
                },
                templateUrl: 'templates/assignment/teacher/assignmentsListByClass/assignmentsListByClass.html',
                controller: ['$scope', function(scope) {
                    var filterInProgressAssignments = function(assignments) {
                        return _.filter(assignments, function(assignment) {
                            return assignment.status !== 'IN_PROGRESS';
                        });
                    };
                    var removeHiddenAssignments = function() {
                        if (scope.assignmentErrorData && scope.assignmentErrorData.length) {
                            var activeAssignmentIds = scope.assignmentData.assignmentsCount.activeAssignmentIds;
                            var activeAssignments = _.filter(scope.assignmentErrorData, function(errorData) {
                                return activeAssignmentIds.indexOf(errorData.assignmentId) !== -1;
                            });
                            return filterInProgressAssignments(activeAssignments);
                        } else {
                            return filterInProgressAssignments(scope.assignmentErrorData);
                        }
                    };
                    scope.assignmentErrors = removeHiddenAssignments();

                    scope.showErrorModal = function(failedAssignmentName, buttonType) {
                        var assignmentErrorsLength = scope.assignmentErrors.length;
                        var assignmentErrorBody;
                        if (!failedAssignmentName) {
                            assignmentErrorBody =  lwcI18nFilter('googleClassroom.unableToAccessGoogleClassAccount');
                        } else {
                            assignmentErrorBody = (lwcI18nFilter('googleClassroom.googleFailedAssignmentName'))
                            .replace('...', failedAssignmentName);
                            if (assignmentErrorsLength === 1) {
                                assignmentErrorBody += lwcI18nFilter('googleClassroom.googleFailedAssignmentSingle');
                            } else {
                                assignmentErrorBody += lwcI18nFilter('googleClassroom.googleFailedAssignmentMultiple')
                                                        .replace('...', (assignmentErrorsLength - 1));
                            }
                        }

                        var buttonLabel = '';
                        if (buttonType === 'reconnect') {
                            buttonLabel = lwcI18nFilter('googleClassroom.reconnect');
                        } else {
                            buttonLabel = lwcI18nFilter('global.action.button.ok');
                        }

                        var okButton = {
                            label: buttonLabel,
                            ariaLabel: buttonLabel,
                            action: function() {
                                standardModal.deactivate();
                                if (buttonType === 'reconnect') {
                                    AssignmentUtil.redirectToRealizeSyncWebApp();
                                }
                            },
                            className: [],
                            disabled: false,
                        };

                        standardModal.activate({
                            heading: lwcI18nFilter('googleClassroom.googleClassSyncFailed'),
                            description: assignmentErrorBody,
                            buttons: [okButton],
                            closeButton: true,
                            overlayActive: true,
                            cssClass: 'customized-items-popup',
                            closeAction: function() {
                                standardModal.deactivate();
                            }
                        });
                    };

                    var filterWebstorageClassID = function(classID, errorType) {
                        var currentSessionClassIDList = webStorage.get('FailedAssignmentClassID');
                        if (currentSessionClassIDList) {
                            currentSessionClassIDList = currentSessionClassIDList.filter(function(a) {
                                return (a.classID === classID && a.errorType === errorType);
                            });
                            return currentSessionClassIDList.length;
                        } else {
                            return false;
                        }
                    };

                    if (scope.showTab === ASSIGNMENT_CONSTANTS.CURRENT &&
                        scope.assignmentErrors && scope.assignmentErrors.length) {
                        scope.revokeError = googleClassroomService.getRevokeError();
                        var currentSessionClassIDList = webStorage.get('FailedAssignmentClassID');
                        if (!currentSessionClassIDList) {
                            currentSessionClassIDList = [];
                        }

                        if (scope.revokeError && (!currentSessionClassIDList ||
                            !filterWebstorageClassID($routeParams.classId, 'revoke'))) {
                            currentSessionClassIDList.push({
                                classID: $routeParams.classId,
                                errorType: 'revoke'
                            });
                            webStorage.add('FailedAssignmentClassID', currentSessionClassIDList);
                            scope.showErrorModal('', 'reconnect');
                        }
                    }
                }],
                link: function(scope) {
                    var isGoogleClass = scope.classRosterData.isGoogleClass();
                    //Helper
                    var retrieveExternalAssignmentDetail = function(assignmentData) {
                            return AssignmentFacadeService.getAssignmentsWithExternalProviderData(assignmentData)
                                .then(function(result) {
                                    return result.assignments;
                                });
                        },
                        requestSortOrderChange = function(sortOptions) {
                            if (scope.bulkShowHideInProgress) {
                                resetBulkShowHideForm();
                            }
                            scope.$emit('assignmentListByClass.assignment.sortUpdate', sortOptions);
                        },
                        notifyAssignmentHidden = function(hiddenAssignment) { //TODO: change to Remove
                            scope.$emit('assignmentListByClass.assignment.hidden', hiddenAssignment);
                        },
                        timeoutsToClear = [],
                        setHiddenColumns = function setHiddenColumns() {
                            if (!scope.closingDrawer && scope.drawerOpen && scope.useSideDrawer) {
                                scope.hideColumns = true;
                            } else if (scope.useSideDrawer && scope.drawerOpen && scope.closingDrawer) {
                                scope.hideColumns = false;
                                var timer = $timeout(function removeDrawer() {
                                    scope.drawerOpen = scope.closingDrawer = false;
                                }, 200);
                                timeoutsToClear.push(timer);
                            } else {
                                scope.hideColumns = false;
                            }
                        },
                        findAssignmentIndex = function(array, assignmentId) {
                            for (var i = 0; i < array.length; i++) {
                                if (array[i] && array[i].assignmentId === assignmentId) {
                                    return i;
                                }
                            }
                            return -1;
                        },
                        resetlocalStorageForHiddenAssingments = function() {
                            var storedDefaultPreference = webStorage.get(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_CLASS +
                                '.' + $currentUser.userId + '.' + $routeParams.classId);
                            if (storedDefaultPreference && storedDefaultPreference.assignmentIds) {
                                var isAssignmentExist = assignmentList.some(function(assignmentId) {
                                    return storedDefaultPreference.assignmentIds.indexOf(assignmentId) > -1;
                                });
                                if (isAssignmentExist) {
                                    AssignmentFacadeService.resetlocalStorageData(storedDefaultPreference,
                                        $currentUser.userId, $routeParams.classId);
                                }
                            }
                        },
                        resetBulkShowHideForm = function() {
                            scope.assignmentListForm.$setPristine();
                            resetlocalStorageForHiddenAssingments();
                            assignmentList = [];
                            angular.forEach(scope.assignmentData.assignments, function(assignment) {
                                delete assignment.selected;
                            });
                        },
                        finishBulkShowHide = function() {
                            scope.bulkShowHideInProgress = false;
                            isLocationChanged = false;
                            isAssignmentTabChanged = false;
                            resetBulkShowHideForm();
                            scope.$emit('assignments.bulkShowHide.finished');
                        },
                        unsavedChangesModal = new UnsavedChangesModal(function(event) {
                            var changesModalDialog = true;
                            return scope.save(event, false, changesModalDialog);
                        }),
                        checkUnsavedChanges = function(currentAction, event) {
                            var isGoodToGo = isLocationChanged ? scope.isSaveDisabled() : false;
                            if (!isGoodToGo) {
                                unsavedChangesModal.showDialog(event).then(
                                    function() {
                                        if (currentAction) {
                                            currentAction();
                                            finishBulkShowHide();
                                        }
                                        if (!isLocationChanged) {
                                            unsavedChangesModal.reset();
                                        }
                                    }, function() {
                                    $rootScope.pageLoaded();
                                });
                            }
                        },
                        assignmentList = [],
                        isLocationChanged = false,
                        isAssignmentTabChanged = false;
                    var MEDIA_TYPE = {
                        PLAYLIST: 'PLAYLIST'
                    };

                    //Init
                    $rootScope.pageLoaded();

                    //Load External assignment detail
                    retrieveExternalAssignmentDetail(scope.assignmentData);

                    //View
                    scope.useSideDrawer = MediaQuery.breakpoint.isDesktop;

                    scope.bulkShowHideInProgress = false;

                    // set Sync With Google default text on page load
                    scope.syncObject = googleClassroomService.getAssignmentDefaultStatus();

                    scope.isBulkShowHidePossible = function() {
                        return !scope.componentLoading && !scope.bulkShowHideInProgress &&
                            scope.assignmentData.assignments.length > 0;
                    };

                    scope.isBulkShowHideFormAvailable = function() {
                        return !scope.componentLoading && scope.bulkShowHideInProgress;
                    };

                    scope.initiateBulkShowHide = function() {
                        if (scope.drawerOpen) {
                            scope.$broadcast('assignmentListByClass.drawer.close');
                        }
                        scope.bulkShowHideInProgress = true;
                        assignmentList = [];
                    };

                    scope.prepareDataForBulkShowHide = function(assignment) {
                        if (assignment.selected) {
                            assignmentList.push(assignment.assignmentId);
                        } else {
                            assignmentList.splice(assignmentList.indexOf(assignment.assignmentId), 1);
                        }
                    };

                    scope.selectAssignment = function($event, assignment, $index) {
                        if (scope.bulkShowHideInProgress) {
                            assignment.selected = !assignment.selected;
                            scope.prepareDataForBulkShowHide(assignment);
                            if (scope.assignmentListForm.$pristine) {
                                scope.assignmentListForm.$setDirty();
                            }
                        } else if (assignment.status === ASSIGNMENT_CONSTANTS.INACTIVE) {
                            return;
                        } else {
                            scope.toggleAssignmentDrawer(assignment, $index);
                        }
                    };

                    scope.isSaveDisabled = function() {
                        return scope.assignmentListForm && scope.assignmentListForm.$pristine ||
                            assignmentList.length <= 0;
                    };

                    scope.isActiveTab = function() {
                        return scope.showTab === ASSIGNMENT_CONSTANTS.CURRENT;
                    };

                    scope.isHiddenTab = function() {
                        return !scope.isActiveTab();
                    };

                    scope.cancel = function(event) {
                        if (event) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                        finishBulkShowHide();
                    };

                    scope.save = function(event, saveButtonClicked, modalSaveChangesClicked) {
                        var status = scope.isHiddenTab() ? ASSIGNMENT_CONSTANTS.AVAILABLE :
                            ASSIGNMENT_CONSTANTS.INACTIVE,
                            bulkShowHideAlertAllowed = !modalSaveChangesClicked ||
                                (modalSaveChangesClicked && !isLocationChanged) ||
                                (modalSaveChangesClicked && isLocationChanged && isAssignmentTabChanged);
                        return AssignmentFacadeService.bulkShowHide($routeParams.classId, assignmentList, status,
                            isGoogleClass).then(function() {
                                if (bulkShowHideAlertAllowed) {
                                    scope.$emit('assignments.bulkShowHide.succeeded', {
                                        currentTab: scope.showTab,
                                        assignmentCount: assignmentList.length,
                                        saveButtonClicked: saveButtonClicked
                                    });
                                    finishBulkShowHide();
                                }
                            }, function(error) {
                                var currentOperation = scope.isHiddenTab() ? 'show' : 'hide';
                                $log.error('Failed to ' + currentOperation + ' assignments', error);
                                if (bulkShowHideAlertAllowed) {
                                    scope.$emit('assignments.bulkShowHide.failed');
                                    finishBulkShowHide();
                                }
                            });
                    };

                    scope.isClickable = function(assignment) {
                        return !assignment.hidden && assignment.status !== 'INACTIVE';
                    };

                    scope.isNotClickable = function(assignment) {
                        return assignment.hidden ||
                            (assignment.status === 'INACTIVE' && !scope.bulkShowHideInProgress) ||
                            (angular.isDefined(scope.assignmentSelected) &&
                            assignment.assignmentId === scope.assignmentSelected.assignmentId);
                    };

                    scope.isHiddenWithBulkShowHideModeOn = function(assignment) {
                        return assignment.hidden && scope.bulkShowHideInProgress;
                    };

                    scope.isInActiveWithBulkShowHideModeOn = function(assignment) {
                        return assignment.status === 'INACTIVE' && !scope.bulkShowHideInProgress;
                    };

                    scope.displayDash = function(assignment) {
                        return assignmentHelperService.displayDash(assignment);
                    };

                    scope.displayScore = function(assignment) {
                        return assignmentHelperService.displayScore(assignment);
                    };

                    scope.getAverageScore = function(assignment) {
                        return assignmentHelperService.getAverageScore(assignment);
                    };

                    scope.getNotSentScoreMsg = function(assignment) {
                        return assignmentHelperService.getNotSentScoreMsg(assignment);
                    };

                    scope.getNotSentScoreDrawerMsg = function() {
                        return scope.assignmentSelected ?
                            assignmentHelperService.getNotSentScoreDrawerMsg(scope.assignmentSelected) : '';
                    };

                    scope.getNotScoredCountMsg = function(assignment) {
                        return assignmentHelperService.getNotScoredCountMsg(assignment);
                    };

                    scope.getNotScoredCountDrawerMsg = function() {
                        return scope.assignmentSelected ?
                            assignmentHelperService.getNotScoredCountDrawerMsg(scope.assignmentSelected) : '';
                    };

                    scope.viewReportScreen = function(assignment) {
                        AssignmentUtil.redirectToReportScreen(assignment);
                        assignmentTelemetryService.sendQuickLinkTelemetryEvent(assignment,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.DATA_LINK,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENTS_BY_CLASS,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING);
                    };

                    //Action
                    scope.reviewManualScore = function(assignment, event) {
                        if (event) {
                            event.stopPropagation();
                        }
                        $location.path('/classes/' + $routeParams.classId + '/assignments/' +
                            assignment.assignmentId + '/manualScoreReview');
                    };

                    scope.toggleAssignmentDrawer = function(assignment, index) {
                        if (angular.isDefined(scope.assignmentSelected) &&
                            scope.assignmentSelected.assignmentId === assignment.assignmentId &&
                            !scope.useSideDrawer) {

                            scope.$broadcast('assignmentListByClass.drawer.close');
                        }
                        if (!assignment.hidden) {
                            var isGoogleClass = scope.classRosterData.isGoogleClass();
                            var selectedAssignment = assignment;
                            var classId = $routeParams.classId;
                            scope.setUpAssignmentForDrawer(selectedAssignment);
                            selectedAssignment.index = index;
                            scope.assignmentSelected = selectedAssignment;
                            googleClassroomService.setFailedAssignmentSyncDetails(scope.assignmentErrorData,
                                selectedAssignment, isGoogleClass, classId, scope.editedAssignments);
                            // get sync status if assignment is synced earlier or get default status
                            scope.syncObject = googleClassroomService.getAssignmentSyncStatus(
                                scope.assignmentSelected.assignmentId, $routeParams.classId);
                            if (scope.syncObject && scope.syncObject.status === GOOGLE_CLASSROOM.SYNC_SUCCESS ||
                                !scope.syncObject) {
                                scope.syncObject = googleClassroomService.getAssignmentDefaultStatus();
                            }
                            AssignmentUtil.setDataLinkDetails(assignment);
                        }
                    };

                    scope.shouldShowBottomDrawer = function shouldShowBottomDrawer(assignment) {
                        return scope.drawerOpen && !scope.useSideDrawer &&
                            scope.assignmentData.assignments.length &&
                            angular.isDefined(scope.assignmentSelected) &&
                            scope.assignmentSelected.assignmentId === assignment.assignmentId;
                    };

                    scope.shouldShowSideDrawer = function() {
                        return scope.drawerOpen && scope.useSideDrawer && scope.assignmentData.assignments.length &&
                                angular.isDefined(scope.assignmentSelected);
                    };

                    scope.open = function(assignment, event) {
                        if (event) {
                            event.preventDefault();
                        }
                        $location.path('/classes/' + $routeParams.classId +
                            '/assignments/' + assignment.assignmentId + '/allstudents');
                        assignmentTelemetryService.sendStudentStatusTelemetryEvent(assignment,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.VIEW_STUDENT_STATUS,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENTS_BY_CLASS,
                            ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING);
                    };

                    // Preview the item as if the student were viewing it.
                    scope.teacherPreview = function(assignment) {
                        var path = ['/classes', $routeParams.classId, 'assignments', assignment.assignmentId, 'preview']
                            .join('/');
                        AssignmentFacadeService.preview(path);
                    };

                    scope.viewDiscussion = function(assignment) {
                        var path = [
                            '/classes',
                            $routeParams.classId,
                            'discussPrompt/assignments',
                            assignment.assignmentId,
                            'content',
                            assignment.contentItem.id
                        ].join('/');

                        $location.path(path).search({
                            discuss: !assignment.isAssignmentPastDueDate() ? 'active' : null
                        });
                    };

                    scope.showGradeInputView = function(e, assignment) {
                        $location.path('/classes/' + $routeParams.classId + '/assignments/' +
                        assignment.assignmentId + '/allstudents/gradeInput');
                    };

                    scope.hide = function(assignment) {
                        AssignmentFacadeService.hideAssignment(assignment, $routeParams.classId,
                            isGoogleClass, $currentUser.userId).then(function() {
                            assignment.hidden = true;
                            notifyAssignmentHidden(assignment);

                            if (angular.isDefined(scope.assignmentSelected) &&
                                assignment.assignmentId === scope.assignmentSelected.assignmentId) {

                                scope.$broadcast('assignmentListByClass.drawer.close');
                            }
                        });
                    };

                    scope.unhide = function($event, assignment) {
                        AssignmentFacadeService.unhideAssignment(assignment, $routeParams.classId,
                            isGoogleClass).then(function() {
                            assignment.hidden = false;
                            scope.$emit('hiddenAssignmentsList.assignment.restored', assignment);
                        });
                    };

                    scope.getOverrideMediaType = function(assignment) {
                        var override = (assignment.type === MEDIA_TYPE.PLAYLIST) ?
                            MEDIA_TYPE.PLAYLIST.toLowerCase() : undefined;
                        return override;
                    };

                    scope.updateSortOrder = function(sortField) {
                        var newSortOrder = (sortField === scope.requestFilter.sortField) ?
                                (scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC ?
                                    ASSIGNMENT_CONSTANTS.DESC : ASSIGNMENT_CONSTANTS.ASC)
                                : scope.requestFilter.sortOrder;

                        requestSortOrderChange({
                            'sortField': sortField,
                            'sortOrder': newSortOrder
                        });

                        if (!scope.useSideDrawer && angular.isDefined(scope.assignmentSelected)) {
                            scope.$broadcast('assignmentListByClass.drawer.close');
                        }
                    };

                    scope.getSortSelectors = function(type) {
                        var selectors = ['sortBy'];
                        if (scope.requestFilter.sortField === type) {
                            selectors.push(scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC ?
                                'icon-sort-down' : 'icon-sort-up');
                        } else {
                            selectors.push('icon-sort');
                        }
                        return selectors;
                    };

                    scope.getSortAriaLabel = function(type) {
                        var outputArray = [];
                        switch (type) {
                            case 'TITLE':
                                outputArray.push(lwcI18nFilter('assignmentList.columnHeader.assignmentTitle.label'));
                                break;
                            case 'DUE_DATE':
                                outputArray.push(lwcI18nFilter('assignmentList.columnHeader.dueDate.label'));
                                break;
                            case 'SCORE':
                                outputArray.push(lwcI18nFilter('assignmentList.columnHeader.average.label'));
                                break;
                            default:
                                console.warn('unexpected sort type received. Ignoring.');
                                break;
                        }
                        outputArray.push(lwcI18nFilter('teacherItemAnalysis.sorting.sortableColumn'));
                        if (scope.requestFilter.sortField === type) {
                            outputArray.push(scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC ?
                                lwcI18nFilter('masteryByStandard.sorting.sortedAscending') :
                                lwcI18nFilter('masteryByStandard.sorting.sortedDescending'));
                        }
                        return outputArray.join(', ');
                    };

                    scope.updateAssigneeList = function(assignment) {
                        var assigneesName,
                            setAssigneeList = function() {
                                assignment.assigneeList = [].concat(assigneesName.classes,
                                    assigneesName.groups, assigneesName.students);
                            };

                        if (!assignment) {
                            return;
                        }

                        assigneesName = assignment.$getAssigneesName(scope.classRosterData, scope.groupData);
                        if (assigneesName.missingStudentIds.length > 0) {

                            User.getUsersByIds(assigneesName.missingStudentIds).then(function(result) {
                                var retrievedStudents = _.filter(result, function(result) {
                                    return result !== null;
                                });

                                assigneesName.students = assigneesName.students.concat(
                                    _.pluck(retrievedStudents, 'lastFirst')
                                );
                                assigneesName.students = _.sortBy(assigneesName.students, function(student) {
                                    return student.toLowerCase();
                                });
                                setAssigneeList();
                            });

                        } else {
                            setAssigneeList();
                        }
                    };

                    scope.updateDisplayFlags = function(assignment) {
                        if (assignment) {
                            scope.averageGradeMsg = assignmentHelperService.getAverageScoreDisplayOptions(assignment);
                        }
                    };

                    scope.setUpAssignmentForDrawer = function(assignment) {
                        assignment.assignedSingleStudent =
                            assignment.assignedTo.length === 1 &&
                            assignment.assignedTo[0].studentUuid !== null;
                        if (assignment.assignedSingleStudent) {
                            if (assignment.studentsCompleted) {
                                assignment.singleStatus = 'completed';
                                assignment.singleStatusMsg = lwcI18nFilter('assignmentStatus.status.completed');
                            } else if (assignment.studentsInProgress) {
                                assignment.singleStatus = 'in progress';
                                assignment.singleStatusMsg = lwcI18nFilter('assignmentStatus.status.inProgress');
                            } else {
                                assignment.singleStatus = 'not started';
                                assignment.singleStatusMsg = lwcI18nFilter('assignmentStatus.status.notStarted');
                            }
                        }
                        scope.updateAssigneeList(assignment);
                        scope.updateDisplayFlags(assignment);
                    };

                    //Watchers
                    scope.$watch('assignmentSelected', function(assignment) {

                        //using ng-if on drawerOpen to render drawer
                        //if we're showing the drawer, we want to render drawer and then hide cols
                        //otherwise, show cols and then remove rendered drawer

                        if (angular.isDefined(assignment) && !scope.drawerOpen) {
                            scope.drawerOpen = true;
                            var timer = $timeout(setHiddenColumns, 200);
                            timeoutsToClear.push(timer);
                        } else if (!angular.isDefined(assignment) && scope.drawerOpen) {
                            scope.closingDrawer = true;
                            setHiddenColumns();
                        }
                    });

                    scope.$on('assignmentListByClass.drawer.close', function() {
                        var timer = $timeout(function removeAssignmentSelected() {
                            delete scope.assignmentSelected;
                        }, 0);
                        timeoutsToClear.push(timer);
                    });

                    scope.$on('window.breakpoint.change', function() {
                        var timer = $timeout(function onBreakpointChange() {
                            scope.useSideDrawer = MediaQuery.breakpoint.isDesktop;
                            setHiddenColumns();
                        }, 0);
                        timeoutsToClear.push(timer);
                    });

                    scope.$on('$destroy', function destroy() {
                        timeoutsToClear.forEach(function(timer) {
                            $timeout.cancel(timer);
                        });
                        timeoutsToClear = null;
                    });

                    scope.$on('assignment:edit:success', function(event, data) {
                        var updatedAssignment = data.assignment;
                        if (updatedAssignment) {
                            var index = findAssignmentIndex(scope.assignmentData.assignments,
                                updatedAssignment.assignmentId);
                            if (index !== -1) {
                                scope.assignmentData.assignments[index] = updatedAssignment;
                                var classId = $routeParams.classId;
                                var assignmentId = updatedAssignment.assignmentId;
                                var key = classId + ' - ' + assignmentId;
                                var statusText = lwcI18nFilter('googleClassroom.syncInProgress');
                                var syncStatus = GoogleClassroomConstants.SYNC_IN_PROGRESS;
                                googleClassroomService.setAssignmentSyncDetails(key, true, statusText, syncStatus);
                                scope.editedAssignments.push(assignmentId);
                                scope.syncObject = googleClassroomService
                                    .getAssignmentSyncStatus(assignmentId, classId);
                            }
                        }
                    });

                    scope.$on('assignments.bulkShowHide.confirm', function(event, bulkShowHideDetails) {
                        var nextAction,
                            nextAssignmentTab;

                        if (bulkShowHideDetails) {
                            // resetting the application state before navigating to next view
                            // when bulkShowHide operaion is inProgress and not saved
                            scope.bulkShowHideInProgress = true;
                            scope.showTab = bulkShowHideDetails.currentState.currentTab || scope.showTab;
                            assignmentList = bulkShowHideDetails.currentState.assignmentList || assignmentList;
                            if (assignmentList.length > 0) {
                                scope.assignmentListForm.$setDirty();
                            }
                            nextAction = bulkShowHideDetails.nextAction ? bulkShowHideDetails.nextAction : null;
                            nextAssignmentTab = bulkShowHideDetails.nextAssignmentTab ?
                                bulkShowHideDetails.nextAssignmentTab : null;
                            isAssignmentTabChanged = nextAssignmentTab ? true : false;
                        }

                        checkUnsavedChanges(function() {
                            // if no active assignments after clicking on "Save Changes" button of save changes modal
                            // then do not perform next action of switching tab from Asssignment By Class to
                            // Assignment by student
                            if (nextAssignmentTab && scope.assignmentData.assignmentsCount.totalActive === 0) {
                                nextAction = null;
                            }
                            if (nextAction) {
                                if (nextAssignmentTab) {
                                    nextAction(nextAssignmentTab);
                                } else {
                                    nextAction();
                                }
                            }
                        }, event);
                    });

                    scope.$on('assignments.bulkShowHide.finish', function() {
                        if (scope.bulkShowHideInProgress) {
                            finishBulkShowHide();
                        }
                    });

                    scope.$watch('isSaveDisabled()', function(newVal, oldVal) {
                        if (newVal !== oldVal && !newVal) {
                            scope.$emit('assignments.bulkShowHide.initiated', {
                                currentTab: scope.showTab,
                                assignmentList: assignmentList
                            });
                        } else {
                            scope.$emit('assignments.bulkShowHide.finished');
                        }
                    });

                    scope.$on('$locationChangeStart', function(event) {
                        isLocationChanged = true;
                        checkUnsavedChanges(null, event);
                    });

                    scope.isExternalSideDrawer = function() {
                        return featureManagementService.isExternalSideDrawerEnabled();
                    };

                    scope.$on('sync_with_google_status', function(event, payload) {
                        scope.$evalAsync(function() {
                            if (payload.status === 'SUCCESS') {
                                if (scope.clonedAssignmentErrorData) {
                                    var successAssignment = scope.clonedAssignmentErrorData.filter(function(data) {
                                        return data.assignmentId === payload.assignmentId;
                                    });
                                    if (successAssignment && successAssignment.length > 0) {
                                        successAssignment[0].status = payload.status;
                                    }
                                }
                            } else {
                                if (scope.clonedAssignmentErrorData) {
                                    var failedAssignment = _.findWhere(scope.clonedAssignmentErrorData,
                                        {assignmentId: payload.assignmentId});
                                    if (!failedAssignment) {
                                        scope.clonedAssignmentErrorData.push({
                                            isRevokeError: false,
                                            assignmentId: payload.assignmentId,
                                            isSyncError: true,
                                            status: payload.status
                                        });
                                    }
                                }
                            }
                        });
                    });

                    scope.syncFailed = function(assignment) {
                        var failedAssignment = _.findWhere(scope.clonedAssignmentErrorData,
                            {assignmentId: assignment.assignmentId});
                        if (failedAssignment && failedAssignment.status === GoogleClassroomConstants.ERROR_UPPERCASE) {
                            return (failedAssignment.isRevokeError || failedAssignment.isSyncError);
                        }
                        return false;
                    };

                    scope.$on('hide_assignment', function(event, data) {
                        var index = findAssignmentIndex(scope.assignmentData.assignments, data.assignmentId);
                        scope.hide(scope.assignmentData.assignments[index]);
                    });

                    scope.syncWithGoogle = function(syncStatus) {
                        if (syncStatus === GOOGLE_CLASSROOM.SYNC_SUCCESS ||
                            syncStatus === GOOGLE_CLASSROOM.SYNC_IN_PROGRESS) {
                            return;
                        } else if (syncStatus === GoogleClassroomConstants.TOKEN_REVOKED) {
                            googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl().toString(), '', '');
                        } else {
                            var assignmentId = scope.assignmentSelected.assignmentId;
                            var classId = $routeParams.classId;
                            var page = GOOGLE_CLASSROOM.ASSIGNMENT_LIST;
                            googleClassroomService.syncAssignment(assignmentId, classId, page, scope.assignmentSelected)
                                .then(function() {
                                    scope.syncObject = googleClassroomService
                                        .getAssignmentSyncStatus(assignmentId, classId);
                                }).catch(function() {
                                    Toast.error(AssignmentUtil.showAssignmentSyncGenericExternalError());
                                    scope.syncObject = googleClassroomService
                                        .getAssignmentSyncStatus(assignmentId, classId);
                                });
                            scope.syncObject = googleClassroomService.getAssignmentSyncStatus(assignmentId, classId);
                        }
                    };

                    scope.isAssignmentSyncFailed = function(assignment) {
                        var failedAssignment = _.findWhere(scope.assignmentErrorData,
                            {assignmentId: assignment.assignmentId});
                        if (failedAssignment && failedAssignment.status === GoogleClassroomConstants.ERROR_UPPERCASE &&
                            !assignment.hidden &&
                            scope.classRosterData.isGoogleClass()) {
                            return (failedAssignment.isRevokeError || failedAssignment.isSyncError);
                        }
                        return false;
                    };
                }
            };
        }
    ]);
