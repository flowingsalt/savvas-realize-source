/* This controller is responsible for
    Filter change:
        Watch for Sort change
    Tab change:
        Switch between Assignment By Class vs Students
    Assignment count change:
        Watch for hidden/active change
    Show More Button
*/

angular.module('Realize.assignment.teacher.levelOneCtrl', [
    'Realize.analytics',
    'Realize.assignment.facadeService',
    'Realize.common.alerts',
    'Realize.assignment.zeroStateService',
    'rlzComponents.components.i18n',
    'Realize.core.security.permissions',
    'Realize.constants.googleClassroom',
    'rlzComponents.assignmentTelemetryModule',
    'rlzComponents.routedComponents.assignments.constants',
    'rlzComponents.components.googleClassroom',
    'Realize.user.currentUser',
    'rlzComponents.components.featureManagement',
])
    .controller('TeacherAssignmentLevelOneCtrl', [
        '$scope',
        '$http',
        '$q',
        'Permissions',
        '$routeParams',
        'ClassRosterData',
        'AssignmentData',
        'GroupData',
        'AssignmentFacadeService',
        'AssignmentViewOptions',
        'AssignmentZeroStateService',
        '$log',
        'AlertService',
        '$rootScope',
        '$location',
        'DateRangeSelectorService',
        'BrowserInfo',
        'ASSIGNMENT_CONSTANTS',
        'AssignmentUtil',
        'lwcI18nFilter',
        '$timeout',
        'GOOGLE_CLASSROOM',
        'assignmentTelemetryService',
        'ASSIGNMENT_TELEMETRY_CONSTANTS',
        'AssignmentErrorData',
        'googleClassroomService',
        '$currentUser',
        'featureManagementService',
        function($scope, $http, $q, Permissions, $routeParams, ClassRosterData, AssignmentData, GroupData,
            AssignmentFacadeService, AssignmentViewOptions, AssignmentZeroStateService, $log, AlertService, $rootScope,
            $location, DateRangeSelectorService, BrowserInfo, ASSIGNMENT_CONSTANTS, AssignmentUtil, lwcI18nFilter,
            $timeout, GOOGLE_CLASSROOM, assignmentTelemetryService, ASSIGNMENT_TELEMETRY_CONSTANTS, AssignmentErrorData,
            googleClassroomService, $currentUser, featureManagementService) {
            'use strict';
            //Helper
            var validateCustomRange = true,
                user = $rootScope.currentUser,
                currentDateFilter = DateRangeSelectorService.getSavedOption(
                    $rootScope.currentUser, 'classDateRange', validateCustomRange
                ) || 'entireClassDuration',
                bulkShowHideStarted = false,
                currentBulkShowHideState = {},
                searchFilterUpdated = false,
                goToFirstPage = false,
                timeoutsToClear = [],
                getAssignmentSyncData = function() {
                    if ($scope.isGoogleClass && featureManagementService.isGoogleClassroomEnabled()) {
                        var transactionQuery = googleClassroomService
                            .getClassSyncQueryForClassAssignment($routeParams.classId);
                        return googleClassroomService.classSyncServiceQuery(transactionQuery)
                            .then(function(successResponse) {
                                return successResponse;
                            })
                            .catch(function(errorResponse) {
                                return errorResponse;
                            });
                    }
                },
                getAssignmentsWithNewFilter = function() {
                    $scope.requestFilter.page = AssignmentUtil.getPageNumber($routeParams.classId,
                        $scope.requestFilter.assignmentStatus);
                    return AssignmentFacadeService.getAssignmentsByClass(
                        $scope.currentRoster.classId, $scope.requestFilter)
                        .then(function(result) {
                            return AssignmentFacadeService.getAssignmentsWithExternalProviderData(result);
                        });
                },
                adjustWrapperMargin = function() {
                    $scope.isCustomDatepickerShown = $scope.activeTab === 'assignmentsByClass' &&
                        $scope.searchFilters && $scope.activeFilterTab !== 'hidden' &&
                        currentDateFilter && currentDateFilter === 'customRange';
                },
                requestAssignments = function(withPageLoad) {

                    if (withPageLoad) {
                        $scope.pageLoading();
                    } else {
                        $scope.componentLoading = true;
                    }

                    // resetting page to 1 everytime while updating view after bulkShowHide completed
                    if (goToFirstPage) {
                        AssignmentUtil.setPageNumber($routeParams.classId, 1, $scope.requestFilter.assignmentStatus);
                        saveSortOptions();
                    }

                    //close any open drawer...
                    $scope.$broadcast('assignmentListByClass.drawer.close');

                    var assignmentsData = $q.all({
                        assignmentData: getAssignmentsWithNewFilter(),
                        assignmentErrorData: getAssignmentSyncData()
                    });

                    return assignmentsData.then(
                        function(result) {
                            $scope.editedAssignments = [];
                            $scope.clonedAssignmentErrorData = [];
                            $scope.assignmentErrorData =
                                googleClassroomService.getAssignmentErrorData(result.assignmentErrorData,
                                    $currentUser.userId, ClassRosterData.studentIds);
                            if ($scope.assignmentErrorData && $scope.assignmentErrorData.length > 0) {
                                $scope.assignmentErrorData.forEach(function(data) {
                                    $scope.clonedAssignmentErrorData.push(data);
                                });
                            }
                            result = getAssignmentDataWithBreadcrumbDetails(result.assignmentData);
                            $scope.currentPage = AssignmentUtil.getPageNumber($routeParams.classId,
                                $scope.requestFilter.assignmentStatus);
                            $scope.assignmentData.assignments = result.assignments;
                            $scope.assignmentData.totalMatched = result.numberOfAssignments;
                            $scope.assignmentData.rowCount = $scope.pageSize;
                            $scope.assignmentData.viewTypes = result.viewTypes;
                            $scope.assignmentData.gradeTypes = result.gradeTypes;
                            $scope.componentLoading = false;
                            adjustWrapperMargin();
                            $scope.pageLoaded();
                            goToFirstPage = false;
                        },
                        function(error) {
                            $scope.pageLoaded();
                            $scope.componentLoading = false;
                            goToFirstPage = false;
                            $log.error('Failed to get assignments for request:',
                                JSON.stringify($scope.requestFilter), ' Error:', JSON.stringify(error));
                        });
                },
                isActiveAssignmentsView = function() {
                    return $scope.activeFilterTab === ASSIGNMENT_CONSTANTS.CURRENT;
                },
                isHiddenAssignmentsView = function() {
                    return !isActiveAssignmentsView();
                },
                shouldMoveToPreviousHiddenView = function() {
                    return AssignmentUtil.getPageNumber($routeParams.classId,
                        $scope.requestFilter.assignmentStatus) > 1 &&
                        !isActiveAssignmentsView() &&
                        $scope.assignmentData.assignments.length === 1 &&
                        $scope.assignmentData.assignments[0].hidden === false;
                },
                updateRequestFilter = function() {
                    var invalidCustomRange =
                        $scope.searchFilters.dateRange.id === ASSIGNMENT_CONSTANTS.CUSTOM_DATE_RANGE &&
                        !($scope.searchFilters.dateRange.startDate && $scope.searchFilters.dateRange.endDate);
                    if (invalidCustomRange) {
                        $scope.$broadcast('dateRangeSelector.selection.requested', 'entireClassDuration');
                    }

                    if (isActiveAssignmentsView()) {
                        $scope.requestFilter = AssignmentViewOptions.getUpdatedFilter($routeParams.classId,
                            $scope.searchFilters);
                        AssignmentViewOptions.saveFilterOptions($routeParams.classId, $scope.requestFilter);
                    } else {
                        $scope.requestFilter = AssignmentViewOptions.getDefaultFilterForHidden($routeParams.classId);
                    }
                    $rootScope.$broadcast('assignments.list.filter.updated', $scope.requestFilter);
                    return requestAssignments(true);
                },
                assignmentRestored = function() {
                    $scope.assignmentData.assignmentsCount.totalActive++;
                    $scope.assignmentData.assignmentsCount.totalHidden--;

                    //if there are no more hidden assignments then switch to active view
                    //if there are no hidden assignments for this page then move to previous page
                    if ($scope.assignmentData.assignmentsCount.totalHidden === 0 && !isActiveAssignmentsView()) {
                        $scope.activeFilterTab = $scope.searchFilters.show = ASSIGNMENT_CONSTANTS.CURRENT;
                    } else if (shouldMoveToPreviousHiddenView()) {
                        var pageNumber = AssignmentUtil.getPageNumber($routeParams.classId,
                            $scope.requestFilter.assignmentStatus);
                        pageNumber -= 1;
                        AssignmentUtil.setPageNumber($routeParams.classId, pageNumber,
                            $scope.requestFilter.assignmentStatus);

                    }

                    if (!isActiveAssignmentsView()) {
                        requestAssignments(false);
                    }
                },
                saveSortOptions = function() {
                    $scope.requestFilter.page = AssignmentUtil.getPageNumber($routeParams.classId,
                        $scope.requestFilter.assignmentStatus);
                    AssignmentViewOptions.saveSortOptions($routeParams.classId, $scope.requestFilter,
                        isHiddenAssignmentsView());
                },

                telemetryDescription = function() {
                    var description;
                    if ($scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC) {
                        description = ASSIGNMENT_TELEMETRY_CONSTANTS.DESCRIPTION.ASC;
                    }else {
                        description = ASSIGNMENT_TELEMETRY_CONSTANTS.DESCRIPTION.DESC;
                    }
                    return description;
                },

                telemetryDefinitionName = function() {
                    var definitionName;
                    switch ($scope.requestFilter.sortField) {
                        case 'TITLE':
                            definitionName = lwcI18nFilter('assignmentList.columnHeader.assignmentTitle.label');
                            break;
                        case 'DUE_DATE':
                            definitionName = lwcI18nFilter('assignmentList.columnHeader.dueDate.label');
                            break;
                        case 'SCORE':
                            definitionName = lwcI18nFilter('assignmentList.columnHeader.average.label');
                            break;
                        default:
                            definitionName = ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING;
                            break;
                    }
                    return definitionName;
                },

                saveModifiedSortOptions = function(newSortOptions) {
                    $scope.requestFilter.sortField = newSortOptions.sortField;
                    $scope.requestFilter.sortOrder = newSortOptions.sortOrder;
                    var attributeValue = {sortField: $scope.requestFilter.sortField,
                        sortOrder: $scope.requestFilter.sortOrder};
                    user.setAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_BYCLASS_KEY, attributeValue, true);
                },
                sortAssignments = function(newSortOptions) {
                    AssignmentUtil.setPageNumber($routeParams.classId, 1, $scope.requestFilter.assignmentStatus);
                    if ($scope.requestFilter.sortField !== newSortOptions.sortField ||
                        $scope.requestFilter.sortOrder !== newSortOptions.sortOrder) {
                        saveModifiedSortOptions(newSortOptions);
                    }
                    requestAssignments(false);
                    assignmentTelemetryService.sendAssignmentSortTelemetryEvent(telemetryDefinitionName(),
                        telemetryDescription(), ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENTS_BY_CLASS,
                        ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING);
                },
                onSearchFilterUpdate = function() {
                    if (searchFilterUpdated) {
                        $scope.componentLoading = true;
                        $scope.activeFilterTab = $scope.searchFilters.show;
                        updateRequestFilter();
                        searchFilterUpdated = false;
                        $scope.$broadcast('assignmentListByClass.drawer.close'); //close drawer on filter update
                    }
                },
                onActiveAssignmentTabUpdate = function(tab) {
                    $location.search('activeTab', tab).replace();
                    if ($location.search().studentNavigationBackId) {
                        $location.search('studentNavigationBackId', null);
                    }
                    $scope.activeTab = tab;
                    adjustWrapperMargin();
                },
                setAlertForBulkShowHide = function(alertType, isCurrentTabActive) {
                    var bulkShowHideAlerts = {
                            success: {
                                message1: lwcI18nFilter('assignmentList.bulkShowHide.successNotification.message1'),
                                message2: lwcI18nFilter('assignmentList.bulkShowHide.successNotification.message2'),
                                title: lwcI18nFilter('assignmentList.bulkShowHide.successNotification.title'),
                                sign: 'ok-sign'
                            },
                            error: {
                                message: lwcI18nFilter('assignmentList.bulkShowHide.errorNotification.message'),
                                sign: 'exclamation-sign'
                            }
                        },
                        alertTitle,
                        alertMessage,
                        alertText;

                    if (alertType === 'success') {
                        alertTitle = '<strong>' + bulkShowHideAlerts[alertType].title + '</strong>';
                        alertMessage = isCurrentTabActive ? bulkShowHideAlerts[alertType].message1 :
                            bulkShowHideAlerts[alertType].message2;
                    } else {
                        alertTitle = '';
                        alertMessage = bulkShowHideAlerts[alertType].message;
                    }

                    alertText = [alertTitle, alertMessage].join(' ');
                    AlertService.addAlert(alertType, bulkShowHideAlerts[alertType].sign, alertText, 1);

                    // To get the alert messages details
                    $scope.alertDetails = AlertService.alerts[0];
                    $scope.alertIsSet = AlertService.alertIsSet();
                },
                finishBulkShowHideAndNavigate = function() {
                    $scope.$broadcast('assignments.bulkShowHide.finish');
                    requestAssignments(false);
                },
                getAssignmentDataWithBreadcrumbDetails = function(AssignmentsData) {
                    _.forEach(AssignmentsData.assignments, function(assignment) {
                        assignment = AssignmentUtil.getAssignmentWithProgramHierarchy(assignment);
                    });
                    return AssignmentsData;
                };

            //Make these available to directives
            $scope.assignmentData = getAssignmentDataWithBreadcrumbDetails(AssignmentData);
            $scope.classRosterData = ClassRosterData;
            $scope.groupData = GroupData;
            $scope.classId = $scope.classRosterData.classId;
            $scope.zeroState = AssignmentZeroStateService.getZeroState($scope.classId);
            $scope.searchFilters = {show: ASSIGNMENT_CONSTANTS.CURRENT};
            $scope.activeFilterTab = $scope.searchFilters.show;
            $scope.requestFilter = AssignmentViewOptions.getDefaultFilter($routeParams.classId);
            $scope.assignmentData.rowCount = $scope.pageSize = $scope.requestFilter.pageSize;
            AssignmentUtil.setPageNumber($routeParams.classId, AssignmentData.page,
                $scope.requestFilter.assignmentStatus);
            if (AssignmentUtil.getPageNumber($routeParams.classId,
                    $scope.requestFilter.assignmentStatus) !== AssignmentData.page) {
                saveSortOptions();
            }
            $scope.currentPage = AssignmentUtil.getPageNumber(
                $routeParams.classId, $scope.requestFilter.assignmentStatus);
            $scope.editedAssignments = [];
            $scope.assignmentErrorData = googleClassroomService.getAssignmentErrorData(AssignmentErrorData,
                $currentUser.userId, ClassRosterData.studentIds);
            $scope.clonedAssignmentErrorData = [];
            if ($scope.assignmentErrorData && $scope.assignmentErrorData.length > 0) {
                $scope.assignmentErrorData.forEach(function(data) {
                        $scope.clonedAssignmentErrorData.push(data);
                    });
            }
            //Init
            $scope.activeTab = $routeParams.activeTab || 'assignmentsByClass';
            $scope.navigationFallback = '/classes';
            $scope.pageLoading(); //Keep spinner until the components are loaded
            adjustWrapperMargin();
            $scope.showExternalAssignmentsView = function() {
                return featureManagementService.isExternalAssignmentsListEnabled();
            };
            $scope.hasPermission = Permissions.hasPermission;
            $scope.isGoogleClass = (ClassRosterData.rosterSource === GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM ||
                ClassRosterData.googleLinkedClass);

            // To get the alert messages details
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();

            //Tab control
            $scope.showTab = function(tab) {
                // check if bulkShowHide operation is already in progress before navigating to other tab
                if (bulkShowHideStarted) {
                    var timer = $timeout(function() {
                        $scope.$broadcast('assignments.bulkShowHide.confirm', {
                            currentState: currentBulkShowHideState,
                            nextAction: onActiveAssignmentTabUpdate,
                            nextAssignmentTab: tab
                        });
                    });
                    timeoutsToClear.push(timer);
                } else {
                    $scope.$broadcast('assignments.bulkShowHide.finish');
                    onActiveAssignmentTabUpdate(tab);
                }
            };

            $scope.hasZeroState = function() {
                return _.any($scope.zeroState);
            };

            $scope.hasZeroStateNotHiddenView = function() {
                return $scope.hasZeroState() && $scope.activeFilterTab !== 'hidden';
            };

            $scope.isAssignmentsByClassView = function() {
                var currentAssignmentsView = !$scope.hasZeroState() && $scope.activeTab === 'assignmentsByClass',
                    hiddenAssignmentsView = $scope.zeroState.allHidden && $scope.activeFilterTab === 'hidden' &&
                        $scope.activeTab === 'assignmentsByClass';
                return currentAssignmentsView || hiddenAssignmentsView;
            };

            $scope.needsPagination = function() {
                return $scope.isAssignmentsByClassView() && !$scope.componentLoading &&
                    $scope.assignmentData.totalMatched > $scope.pageSize &&
                    !featureManagementService.isExternalAssignmentsListEnabled();
            };

            $scope.$on('assignmentListByClass.assignment.sortUpdate', function(event, newSortOptions) {
                $log.log('Sorting by ', newSortOptions);
                sortAssignments(newSortOptions);
            });

            $scope.$on('assignmentListByClass.assignment.hidden', function(event, hiddenAssignment) {
                $log.log('Hidden:', hiddenAssignment);
                $scope.assignmentData.assignmentsCount.totalHidden++;
                $scope.assignmentData.assignmentsCount.totalActive--;
            });

            $scope.$on('hiddenAssignmentsList.assignment.restored', assignmentRestored);

            $scope.$on('assignment:searchFilterUpdated', function(event, newFilter) {
                $log.log('Filter updated:', newFilter, newFilter.dateRange);
                searchFilterUpdated = true;
                // check if bulkShowHide operation is already in progress before applying any filter update
                if (bulkShowHideStarted) {
                    var timer = $timeout(function() {
                        $scope.$broadcast('assignments.bulkShowHide.confirm', {
                            currentState: currentBulkShowHideState,
                            nextAction: onSearchFilterUpdate
                        });
                    });
                    timeoutsToClear.push(timer);
                } else {
                    $scope.$broadcast('assignments.bulkShowHide.finish');
                    onSearchFilterUpdate();
                }
            });

            $scope.$on('assignment:edit:success', function(event, args) {
                $scope.$broadcast('assignmentListByClass.drawer.close');
                if (angular.isFunction(args.callback)) {
                    args.callback();
                }
            });

            $scope.$on('dateRangeSelector.selection.change', function(event, newOption) {
                currentDateFilter = newOption.id;
                adjustWrapperMargin();
            });

            $scope.$on('assignment:zeroState:viewHidden', function() {
                //Tell assignmentFilter to set to hidden
                $scope.$broadcast('assignment:filter:viewHidden');
            });

            $scope.$on('assignments.bulkShowHide.succeeded', function(event, bulkShowHideData) {
                var isCurrentTabActive = bulkShowHideData.currentTab === ASSIGNMENT_CONSTANTS.CURRENT;
                if (!isCurrentTabActive) {
                    $scope.assignmentData.assignmentsCount.totalActive =
                        $scope.assignmentData.assignmentsCount.totalActive + bulkShowHideData.assignmentCount;
                    $scope.assignmentData.assignmentsCount.totalHidden =
                        $scope.assignmentData.assignmentsCount.totalHidden - bulkShowHideData.assignmentCount;
                } else {
                    $scope.assignmentData.assignmentsCount.totalActive =
                        $scope.assignmentData.assignmentsCount.totalActive - bulkShowHideData.assignmentCount;
                    $scope.assignmentData.assignmentsCount.totalHidden =
                        $scope.assignmentData.assignmentsCount.totalHidden + bulkShowHideData.assignmentCount;
                }

                // set flag for resetting page to 1 everytime after bulkShowHide completed
                // irrespective of the page where this operation started
                goToFirstPage = true;

                if (searchFilterUpdated) {
                    onSearchFilterUpdate();
                } else if ($scope.assignmentData.assignmentsCount.totalHidden === 0) {
                    //if there are no more hidden assignments then switch to active view
                    $scope.activeFilterTab = $scope.searchFilters.show = ASSIGNMENT_CONSTANTS.CURRENT;
                } else {
                    requestAssignments(true);
                }

                setAlertForBulkShowHide('success', isCurrentTabActive);
            });

            $scope.$on('assignments.bulkShowHide.failed', function() {
                setAlertForBulkShowHide('error');
            });

            $scope.$on('assignments.bulkShowHide.initiated', function(event, currentState) {
                bulkShowHideStarted = true;
                currentBulkShowHideState = currentState;
            });

            $scope.$on('assignments.bulkShowHide.finished', function() {
                bulkShowHideStarted = false;
            });

            $scope.$watch('zeroState', function(newZeroState) {
                $scope.zeroState = newZeroState;
            }, true);

            $scope.$watch('currentPage', function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    var shouldFetchAssignmentsForPage = AssignmentUtil
                        .getPageNumber($routeParams.classId, $scope.requestFilter.assignmentStatus) !== newVal;
                    AssignmentUtil.setPageNumber($routeParams.classId, newVal, $scope.requestFilter.assignmentStatus);
                    saveSortOptions();
                    if (shouldFetchAssignmentsForPage) {
                        // check if bulkShowHide operation is already in progress before navigating to other page
                        if (bulkShowHideStarted) {
                            $scope.$broadcast('assignments.bulkShowHide.confirm', {
                                currentState: currentBulkShowHideState,
                                nextAction: finishBulkShowHideAndNavigate
                            });
                        } else {
                            finishBulkShowHideAndNavigate();
                        }
                    }
                }
            });

            $scope.$on('$destroy', function destroy() {
                timeoutsToClear.forEach(function(timer) {
                    $timeout.cancel(timer);
                });
                timeoutsToClear = null;
            });
        }
    ]);
