// This file will soon be obsolete as we are moving to a pull page assignment create/edit
// TODO: Cleanup - Need to move date related code to directive
angular.module('Realize.assignment.modalCtrl', [
    'Realize.common.alerts',
    'Realize.constants.mediaType',
    'Realize.externalItem.Strategy',
    'Realize.constants.contribSource',
    'Realize.assignment.utilService',
    'realize.core.isoDateService',
    'Realize.common.timeDropdownDirective',
    'rlzComponents.components.rubricSidePanel',
    'Realize.search.telemetry',
    'rlzComponents.components.telemetry.constants',
    'rlzComponents.components.myLibrary',
])
    .controller('AssignmentModalCtrl', [
        '$scope',
        '$rootScope',
        '$log',
        '$q',
        '$location',
        'Assignment',
        'AssignmentFacadeService',
        'ASSIGNMENT_CONSTANTS',
        'lwcI18nFilter',
        'AlertService',
        'InlineAlertService',
        '$route',
        'AssignmentDataGenerator',
        'RangeDatepickerOptions',
        'DatepickerUtil',
        'MEDIA_TYPE',
        '$window',
        'ExternalItemStrategy',
        'CONTRIBUTOR_SOURCE',
        'AssignmentUtil',
        'ISODateService',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'HEADER_HEIGHT',
        'searchTelemetryUtilitiesService',
        'Toast',
        'GOOGLE_CLASSROOM',
        'TELEMETRY_CONSTANTS',
        'myLibraryEventTracking',
        'featureManagementService',
        'locationUtilService',
        function($scope, $rootScope, $log, $q, $location, Assignment, AssignmentFacadeService, ASSIGNMENT_CONSTANTS,
            lwcI18nFilter, AlertService, InlineAlertService, $route, AssignmentDataGenerator,
            RangeDatepickerOptions, DatepickerUtil, MEDIA_TYPE, $window, ExternalItemStrategy, CONTRIBUTOR_SOURCE,
            AssignmentUtil, ISODateService, rubricEventTracking, telemetryUtilitiesService, HEADER_HEIGHT,
            searchTelemetryUtilitiesService, Toast, GOOGLE_CLASSROOM, TELEMETRY_CONSTANTS, myLibraryEventTracking,
            featureManagementService, locationUtilService) {

            'use strict';

            /***** DatePicker Options ****/
            var rangeDatepickerOptions = new RangeDatepickerOptions('#start-date', '#due-date'),
                remediationRangeDatepickerOptions = new RangeDatepickerOptions('#due-date', '#remediation-date',
                    ASSIGNMENT_CONSTANTS.ADD_REMEDIATION_DAYS),
                externalProviderName = ExternalItemStrategy.getExternalProviderName(),
                elementsToCleanUp = [],
                nextHalfHour = function() {
                    var date = Date.now(),
                        duration = moment.duration(30, ASSIGNMENT_CONSTANTS.TIMES.MINUTES);
                    return moment(Math.ceil((+date) / (+duration)) * (+duration)).format('LT')
                        .toLowerCase();
                },
                isSameDateSelected = function() {
                    return $scope.startDate === $scope.dueDate;
                },
                isToday = function(date) {
                    return date === moment().format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY);
                },
                lastHalfHour = function() {
                    var now = moment(),
                        end = moment().endOf(ASSIGNMENT_CONSTANTS.TIMES.DAY),
                    diff = end.diff(now, ASSIGNMENT_CONSTANTS.TIMES.MINUTES);
                    return diff < 30;
                },
                isBefore = function(startTime, endTime) {
                    return moment(startTime, 'h:mma').isBefore(moment(endTime, 'h:mma'));
                },
                updateStartTime = function() {
                    var shouldUpdate = $scope.setTime && $scope.time.start &&
                        !$scope.startDateOptions.disabled && isToday($scope.startDate);
                    if (shouldUpdate && lastHalfHour()) {
                        //set the startTime to '' so that the start time displays as empty on UI.
                        //while saving the assignment, startTime will go as 12.00AM..
                        $scope.selectStartTime('');
                    } else if (shouldUpdate && isBefore($scope.time.start, nextHalfHour())) {
                        $scope.selectStartTime(nextHalfHour());
                    } else if (!$scope.time.start) {
                        var time = isToday($scope.startDate) ? nextHalfHour() : $scope.hours[0];
                        $scope.selectStartTime(time);
                    }
                },
                updateDueTime = function() {
                    if ($scope.time.due && ($scope.dueDate === $scope.startDate) &&
                            isBefore($scope.time.due, $scope.time.start)) {
                        $scope.selectDueTime($scope.hours[$scope.hours.length - 1]);
                    } else if ($scope.time.start && $scope.startDateOptions.disabled && isToday($scope.dueDate) &&
                            isBefore($scope.time.due, nextHalfHour())) {
                        $scope.selectDueTime(nextHalfHour());
                    }
                },
                updateRemediationTime = function() {
                    if ($scope.assignment.allowRemediation && $scope.time.due) {
                        $scope.selectRemediationTime($scope.time.due);
                    }
                },
                updateRemediationDate = function() {
                    if ($scope.dueDate) {
                        $scope.remediationDueDate = Assignment.getDefaultRemediationDateString($scope.dueDate);
                    }
                },
                datePickerForId = function(domSelectorId) {
                    return function() {
                        var domSelector = '#' + domSelectorId,
                            datePickerElem = angular.element(domSelector).datepicker();
                        angular.element('#ui-datepicker-div').addClass('assign-dates-stack-order');
                        datePickerElem.on('keydown', function(e) {
                            DatepickerUtil.customizedKeydownEventForDatepicker(e, domSelector);
                        });
                        elementsToCleanUp.push(datePickerElem);
                    };
                },
                removeDatePicker = function() {
                    return function() {
                        angular.element('#ui-datepicker-div').removeClass('assign-dates-stack-order');
                    };
                },
                isTimeValid = function() {
                    return $scope.assignmentForm.startDate.$valid && $scope.assignmentForm.dueDate.$valid &&
                        $scope.assignmentForm.startTime.$valid && $scope.assignmentForm.dueTime.$valid;
                },
                checkForCorrectTime = function() {
                    var startDateTime,
                        dueDateTime,
                        currentTime = new Date();

                    startDateTime = $scope.startDate + ' '  + $scope.time.start;
                    dueDateTime = $scope.dueDate + ' ' + $scope.time.due;

                    if ((!$scope.editMode && isToday($scope.startDate)) ||
                            ($scope.editMode && isToday($scope.startDate) && !$scope.isAssignmentStarted())) {
                        $scope.isStartTimeBeforeCurrentTime =
                            (new Date(startDateTime) < currentTime);
                        $scope.assignmentForm.startTime.$setValidity('pattern',
                            !$scope.isStartTimeBeforeCurrentTime);
                    }

                    $scope.isDueTimeBeforeStartTime =
                        (new Date(dueDateTime) < new Date(startDateTime));
                    $scope.assignmentForm.dueTime.$setValidity('pattern',
                        !$scope.isDueTimeBeforeStartTime);

                };
            var isContainedGoogleClass = false;

            $scope.mediaTypeOverride = undefined;
            $scope.startDateOptions = rangeDatepickerOptions.start;
            $scope.startDateOptions.minDate = 0;

            $scope.dueDateOptions = rangeDatepickerOptions.end;
            $scope.dueDateOptions.minDate = 0;

            $scope.remediationDueDateOptions = remediationRangeDatepickerOptions.end;
            $scope.remediationDueDateOptions.minDate = 0;

            $scope.setTime = false;
            $scope.hours = AssignmentUtil.getHours();
            $scope.limtStartTimes = $scope.hours.length - 1;
            $scope.time = {
                start: $scope.hours[0],
                due: $scope.hours[$scope.hours.length - 1],
                remediation: $scope.hours[$scope.hours.length - 1]
            };
            $scope.startDateOptions.$setBeforeShow(datePickerForId('start-date'));
            $scope.dueDateOptions.$setBeforeShow(datePickerForId('due-date'));
            $scope.remediationDueDateOptions.$setBeforeShow(datePickerForId('remediation-date'));
            $scope.startDateOptions.$setOnClose(removeDatePicker);
            $scope.dueDateOptions.$setOnClose(removeDatePicker);
            $scope.remediationDueDateOptions.$setOnClose(removeDatePicker);
            $scope.isStartTimeBeforeCurrentTime =  false;
            $scope.isDueTimeBeforeStartTime = false;

            // Init variables
            $scope.assignment = { assignees: [] };
            $scope.titleMaxLength = ASSIGNMENT_CONSTANTS.TITLE_MAX_LENGTH;
            $scope.createMode = ($scope.mode === 'create');
            $scope.editMode = ($scope.mode === 'edit');
            $scope.disableSave = true;
            $scope.getSelectedAssignees = function() {
                return _.filter($scope.assignees, function(assignee) {
                    return assignee.selected === true;
                });
            };

            $scope.startHourIsDisabled = function(indexOfHour) {
                var timeBeforeStartTime = indexOfHour < $scope.hours.indexOf(nextHalfHour());
                return isToday($scope.startDate) && (lastHalfHour() || timeBeforeStartTime);
            };

            $scope.hourIsDisabled = function(indexOfHour) {
                var timeToBeCompared = $scope.hours[indexOfHour];
                if ($scope.time.start && !$scope.startDateOptions.disabled && isSameDateSelected()) {
                    return isBefore(timeToBeCompared, $scope.time.start);
                } else if ($scope.time.start && $scope.startDateOptions.disabled && isToday($scope.dueDate)) {
                    return isBefore(timeToBeCompared, nextHalfHour());
                }
            };

            $scope.remediationhourIsDisabled = function(indexOfHour) {
                if ($scope.time.due && isToday($scope.remediationDueDate)) {
                    return indexOfHour < $scope.hours.indexOf(nextHalfHour());
                }
            };

            $scope.selectStartTime = function(selectedTime) {
                $scope.$broadcast('time.updated.in.controller', 'startTime');
                $scope.time.start = selectedTime;
            };

            $scope.selectDueTime = function(selectedTime) {
                $scope.$broadcast('time.updated.in.controller', 'dueTime');
                $scope.time.due = selectedTime;
                updateRemediationTime();
            };

            $scope.selectRemediationTime = function(selectedTime) {
                $scope.$broadcast('time.updated.in.controller', 'remediationTime');
                $scope.time.remediation = selectedTime;
            };

            $scope.isEtext = function() {
                var eText = $scope.item.mediaType === 'eText' || $scope.item.mediaType === 'Selected Reading',
                notebookIntegration = $window.realizeNotebookIntegrationEnabled === 'true';
                return eText && notebookIntegration;
            };

            $scope.$watch('startDate', function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.isStartTimeBeforeCurrentTime = false;
                    updateStartTime();
                    updateDueTime();
                }
            });

            $scope.$watch('dueDate', function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.isDueTimeBeforeStartTime = false;
                    updateDueTime();
                    updateRemediationDate();
                }
            });

            $scope.$watch('time.start', function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.isStartTimeBeforeCurrentTime = false;
                    updateDueTime();
                }
            });

            $scope.$watch('time.due', function() {
                $scope.isDueTimeBeforeStartTime = false;
            });

            $scope.$on('time.autocorrected', function(event, timeFieldName) {
                if (timeFieldName === 'dueTime') {
                    updateRemediationTime();
                    $scope.assignmentForm.remediationTime.$setViewValue($scope.time.remediation);
                    $scope.assignmentForm.remediationTime.$render();
                }
            });

            $scope.$watch('setTime', function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    if ($scope.setTime === false) {
                        $scope.selectStartTime(ASSIGNMENT_CONSTANTS.TIMES.MIN_TIME);
                        $scope.selectDueTime(ASSIGNMENT_CONSTANTS.TIMES.MAX_TIME);
                        $scope.selectRemediationTime(ASSIGNMENT_CONSTANTS.TIMES.MAX_TIME);
                    } else if ($scope.setTime === true) {
                        updateStartTime();
                    }
                }
            });

            var modalHeaderHeight = 48;
            var modalFooterHeight = 48;
            // padding is a value that is the addition of:
            //   a.)  the gap between modal footer and bottom of window, plus
            //   b.)  the gap between modal header and bottom of realize header.
            // This value remains constant.
            var padding = 110;

            function getModalBodyMaxHeight() {
                var windowHeight = $window.innerHeight;
                $scope.modalBodyMaxHeight = windowHeight - HEADER_HEIGHT -
                    modalHeaderHeight - modalFooterHeight - padding;
                $scope.$applyAsync();
            }

            var jqLiteWindow = angular.element($window);
            getModalBodyMaxHeight();
            jqLiteWindow.on('resize', getModalBodyMaxHeight);
            $scope.$on('$destroy', function() {
                jqLiteWindow.off('resize', getModalBodyMaxHeight);
            });

            /* typeAndSelect Data */
            $scope.preSelectedItems = []; //populated when REST for students/classes/groups is complete

            $scope.assignees = [];

            $scope.typeAndSelectConfig = {
                results: $scope.assignees,
                formText: {
                    mainLabel: lwcI18nFilter('assignmentForm.chooseAssignees.label'),
                    help: lwcI18nFilter('assignmentForm.chooseAssignees.help'),
                    noMatch: lwcI18nFilter('assignmentForm.chooseAssignees.noMatchNotification'),
                    submitError: lwcI18nFilter('assignmentForm.errorNotification.assignee.message'),
                    addAllLabel: lwcI18nFilter('calendar.eventForm.chooseClasses.addAllClasses'),
                    offScreenRemove: lwcI18nFilter('assignmentForm.removeAssignee.a11y'),
                    placeholder: lwcI18nFilter('assignmentForm.chooseAssignees.optional'),
                    from: lwcI18nFilter('assignmentForm.chooseAssignees.from')
                },
                isAddAllEnabled: false,
                isFormSubmitted: function() {
                    return $scope.assignPressed;
                },
                customFilter: function(viewValue) {
                    if (viewValue.search(',') === -1) {
                        return {
                            assigneeTitle: viewValue
                        };
                    } else {
                        var names = viewValue.split(','),
                            last = $.trim(names[0]),
                            first = $.trim(names[1]);
                        return {
                            lastName: last,
                            firstName: first
                        };
                    }
                },
                popoverPlacement: 'left-top',
                preSelectedItems: $scope.preSelectedItems,
                hideRemoveIcon: function(assignee) {
                    return $scope.editMode && ($scope.getSelectedAssignees().length <= 1 ||
                        ($scope.isAssignmentStarted() && assignee.preSelected));
                }

            };

            $scope.$watch('remediationDisplay + hasOtherLanguage + isContentRTAEnabled', function() {
                if ($scope.hasOtherLanguages && ($scope.remediationDisplay || $scope.isContentRTAEnabled)) {
                    $scope.typeAndSelectConfig.customClasses = 'twoOptions';
                } else if ($scope.remediationDisplay || $scope.hasOtherLanguages || $scope.isContentRTAEnabled) {
                    $scope.typeAndSelectConfig.customClasses = 'oneOption';
                }
            });

            $scope.matchTmplUrl = 'templates/assignment/assignmentModalTypeaheadMatch.html';

            $scope.selectedItemTmplUrl = 'templates/assignment/assignmentModalSelectedItem.html';

            $scope.$on('typeAndSelect.itemRemoved', function(event, item) {
                if (item.preSelected) {
                    item.removedFromEdit = true;
                }
                $scope.assignmentForm.$setDirty();
            });

            $scope.validate = {
                title: function() {
                    return $.trim($scope.assignment.title).length <= 0;
                },
                startDate: function() {
                    var form = $scope.assignmentForm;
                    return form.startDate.$invalid;
                },
                dueDate: function() {
                    var form = $scope.assignmentForm;
                    return form.dueDate.$invalid;
                },
                remediationDueDate: function() {
                    var form = $scope.assignmentForm;
                    if (form.remediationDueDate) {
                        return form.remediationDueDate.$invalid;
                    } else {
                        return true;
                    }
                },
                showMessage: function() {
                    return (this.title() || this.startDate() || this.dueDate());
                },
                assignees: function() {
                    return _.isEmpty($scope.getSelectedAssignees());
                },
                startTime: function() {
                    var form = $scope.assignmentForm;
                    return form.startTime.$invalid;
                },
                dueTime: function() {
                    var form = $scope.assignmentForm;
                    return form.dueTime.$invalid;
                },
                remediationTime: function() {
                    var form = $scope.assignmentForm;
                    if (form.remediationTime) {
                        return form.remediationTime.$invalid;
                    } else {
                        return true;
                    }
                }
            };

            $scope.formDataChanged = function() {
                var currentSelectedAssignees = $scope.getSelectedAssignees(),
                    preSelectedAssignees = _.filter($scope.assignees, function(assignee) {
                        return assignee.preSelected;
                    }),
                    existingDateLegible = {
                        startDate: $scope.item.parsedStart.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY),
                        dueDate: $scope.item.parsedEnd.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY),
                        remediationDueDate: $scope.item.parsedRemediationEnd ?
                            $scope.item.parsedRemediationEnd.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY) : 0
                    },
                    existingTime = {
                        startTime: $scope.item.parsedStart.format('LT').toLowerCase(),
                        dueTime: $scope.item.parsedEnd.format('LT').toLowerCase(),
                        remediationTime: $scope.item.parsedRemediationEnd ?
                            $scope.item.parsedRemediationEnd.format('LT').toLowerCase() : 0
                    },
                    fieldsUpdated = {
                        title: $scope.item.title !== $scope.assignment.title,
                        startDate: existingDateLegible.startDate !== $scope.startDate,
                        dueDate: existingDateLegible.dueDate !== $scope.dueDate,
                        remediationDueDate: existingDateLegible.remediationDueDate !== $scope.remediationDueDate,
                        //Special case, instruction is entered and cleared out
                        instruction: $scope.item.instructions !== $scope.assignment.instructions &&
                                    !($scope.item.instructions === null && $scope.assignment.instructions === ''),
                        assignees: !_.isEqual(currentSelectedAssignees, preSelectedAssignees),
                        multiLanguage: $scope.item.allowMultipleLanguage !== $scope.assignment.allowMultipleLanguage,
                        RRSActivity: $scope.item.includeRRSActivity !== $scope.assignment.includeRRSActivity,
                        remediation: $scope.item.allowRemediation !== $scope.assignment.allowRemediation,
                        startTime: existingTime.startTime !== $scope.time.start,
                        dueTime: existingTime.dueTime !== $scope.time.due,
                        remediationTime: existingTime.remediationTime !== $scope.time.remediation
                    };

                return _.any(fieldsUpdated);

            };

            $scope.showAssignmentDetailsIntegration = function() {
                return featureManagementService.isExternalAssignmentDetailsLevelTwoEnabled();
            };

            $scope.showExternalTocViewer = function() {
                return featureManagementService.isExternalTOCViewerEnabled();
            };

            $scope.showExternalMyLibraryViewer = function() {
                return featureManagementService.isMyLibraryViewerEnabled();
            };

            $scope.showExternalMyLibraryTOCViewer = function() {
                return featureManagementService.isMyLibraryTocViewerEnabled();
            };

            $scope.saveAssignment = function(event) {
                event.preventDefault();
                event.stopPropagation();

                $scope.assignPressed = true;

                // Trim extra characters
                if ($scope.assignment.instructions !== null) {
                    $scope.assignment.instructions = $scope.assignment.instructions.substring(0, 250);
                }

                if ($scope.setTime && isTimeValid()) {
                    checkForCorrectTime();
                }

                //proceed if required fields are valid && there is at least one assignee selected by teacher
                if ($scope.assignmentForm.$valid && !$scope.validate.assignees()) {
                    var assignment = $scope.assignment;
                    $scope.isInProgress = true;
                    var googleErrorEditAlertMsg;
                    if ($scope.editMode) {
                        googleErrorEditAlertMsg = AssignmentUtil.showAssignmentEditExternalError();
                    } else {
                        googleErrorEditAlertMsg = AssignmentUtil.showAssignmentCreateExternalError();
                    }

                    var hasMultipleItems = $scope.assignment.contentItem.contentItems.length > 1;

                    var showGoogleErrorMessage = function(response) {
                        Toast.close();
                        if (response.status === GOOGLE_CLASSROOM.ACCOUNT_REVOKED_STATUS_CODE) {
                            Toast.error(AssignmentUtil.showUnableToAccessExternalAccountError());
                        } else {
                            Toast.error(googleErrorEditAlertMsg);
                        }
                    };

                    var showInlineAlertOnExternalError = function(assignmentId) {
                        InlineAlertService.addAlert(assignmentId, {
                            type: 'googleError', msg: googleErrorEditAlertMsg.msg
                        });
                    };

                    var setContainedGoogleClass = function(assignee) {
                        if (!isContainedGoogleClass && assignee.selected && assignee.isFromGoogleClass()) {
                            isContainedGoogleClass = true;
                        }
                    };

                    var sendAssignmentCreateStatus = function(contentItemId, assignmentStatus) {
                        $rootScope.$broadcast('assignment.create.status',
                            { itemId : contentItemId, status: assignmentStatus,
                            isAssignedToGoogleClass: isContainedGoogleClass });
                    };

                    var showAssignmentCreateStatusAlerts = function() {
                        return (!$scope.showExternalTocViewer() ||
                            ($scope.showExternalTocViewer() && !(locationUtilService.isTOCActive() &&
                            !locationUtilService.isMyContentPage() &&
                            !locationUtilService.isDiscussionPromptPage()))) &&
                            !($scope.showExternalMyLibraryViewer() && locationUtilService.isMyLibraryTabActive() &&
                            !locationUtilService.isRemediationPage() && !locationUtilService.isAdaptiveHomeworkPage() &&
                            !(locationUtilService.isMyLibraryLesson() && (!$scope.showExternalTocViewer() ||
                            !$scope.showExternalMyLibraryTOCViewer())));
                    };

                    var sendAssignmentEditMessage = function(assignmentStatus) {
                        if ($scope.editMode) {
                            $rootScope.$broadcast('assignment.edit.status', { status: assignmentStatus });
                        }
                    };

                    var showAssignmentEditStatusAlerts = function() {
                        return !$scope.showAssignmentDetailsIntegration() ||
                            ($scope.showAssignmentDetailsIntegration() &&
                            $location.path().search('/allstudents') === -1);
                    };

                    // Create and Edit for AssignmentFacadeService uses same call
                    var saveAssignment = function(success, error) {
                        var startDateTime = $scope.startDate + ' '  + $scope.time.start;
                        var dueDateTime = $scope.dueDate + ' ' + $scope.time.due;

                        if ($scope.assignment.allowRemediation && $scope.remediationDisplay) {
                            if (!$scope.remediationDueDate) {
                                $scope.remediationDueDate = updateRemediationDate();
                            }
                            var remediationDueDateTime = $scope.remediationDueDate + ' ' + $scope.time.remediation;
                            assignment.remediationDueDate = ISODateService
                                .toDateTimeString(new Date(remediationDueDateTime));
                        }
                        assignment.startDate = ISODateService.toDateTimeString(new Date(startDateTime));
                        assignment.dueDate = ISODateService.toDateTimeString(new Date(dueDateTime));
                        var newAssignment = new Assignment(assignment);
                        $log.log('Creating assignment object', newAssignment);
                        //Additional flags that weren't stored in the old assignment object.
                        newAssignment.hasRemediation = $scope.remediationDisplay;
                        newAssignment.hasMultipleLanguage = $scope.hasOtherLanguages;
                        newAssignment.useRubric = $scope.assignment.useRubric;
                        newAssignment.multiSelectRequest = $scope.multiSelectRequest;
                        AssignmentUtil.getProgramHierarchy($scope.item, newAssignment.itemUuid)
                            .then(function(programHierarchy) {
                                // jscs:disable maximumLineLength
                                var contentMediaType = '';
                                if ($scope.assigntype === TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.ASSIGN_SELECTED) {
                                    contentMediaType = TELEMETRY_CONSTANTS.DESCRIPTION.MULTI_SELECT;
                                } else {
                                    contentMediaType = $scope.item.mediaType;
                                }

                                if ($location.path().search('/myLibrary') === 0) {
                                    myLibraryEventTracking.onAssignContent($scope.item.id, contentMediaType);
                                } else {
                                    searchTelemetryUtilitiesService.sendTelemetryEventsFromCreateAssignment(programHierarchy, contentMediaType);
                                }
                                programHierarchy = 'programHierarchy=' + encodeURIComponent(JSON.stringify(programHierarchy));
                                AssignmentFacadeService.saveAssignment(newAssignment, programHierarchy)
                                    .then(success, error);
                            });
                    };
                    if ($scope.editMode) {
                        if ($scope.isAssignmentStarted()) { //Post start date - send only assignees added
                            $scope.assignment.assignees = _.filter($scope.assignees, function(assignee) {
                                var isNewSelection = !assignee.preSelected && assignee.selected;
                                if (isNewSelection !== undefined) {
                                    setContainedGoogleClass(assignee);
                                }
                                return isNewSelection;
                            });
                        } else {
                            $scope.assignment.removedAssignees = _.filter($scope.assignees, function(assignee) {
                                return assignee.removedFromEdit && !assignee.selected;
                            });
                            $scope.assignment.assignees = _.filter($scope.assignees, function(assignee) {
                                setContainedGoogleClass(assignee);
                                return assignee.selected;
                            });
                        }
                        var alertAssignmentId = $scope.assignment.assignmentId;
                        var successEditAlertMsg;
                        if (isContainedGoogleClass) {
                            successEditAlertMsg =
                                [
                                    '</strong>',
                                    lwcI18nFilter(
                                        'googleClassroom.editAssignment.successNotification.message'
                                    )
                                ].join(' ');
                        } else {
                            successEditAlertMsg =
                                ['<strong>',
                                    lwcI18nFilter(
                                        'assignmentList.editAssignment.successNotification.assignmentEdited.title'
                                    ),
                                    '</strong>',
                                    lwcI18nFilter(
                                        'assignmentList.editAssignment.successNotification.assignmentEdited.message'
                                    )
                                ].join(' ');
                        }

                        var editSuccess = function(result) {
                            var currentClassAssignment = _.findWhere(result.assignedTo, {
                                    classUuid: $rootScope.currentRoster.classId
                                });

                            if (currentClassAssignment && currentClassAssignment.assignmentId) {
                                alertAssignmentId = currentClassAssignment.assignmentId;
                            } else {
                                alertAssignmentId = $scope.assignment.assignmentId;
                            }

                            var addAlertCallback = function() {
                                InlineAlertService.addAlert(alertAssignmentId, {
                                    type: 'success',
                                    msg: successEditAlertMsg
                                });
                            };
                            if (showAssignmentEditStatusAlerts()) {
                                if ($scope.useBannerAlert) {
                                    AlertService.addAlert('success', 'ok-sign', successEditAlertMsg, 2);
                                    $scope.close();
                                    $route.reload();
                                } else {
                                    $scope.$emit('assignmentListByClass.drawer.close');
                                    $rootScope.$broadcast('assignment:edit:success', {
                                        assignment: new Assignment(angular.extend($scope.item, $scope.assignment)),
                                        callback: addAlertCallback
                                    });
                                    $scope.close();
                                }
                            }
                            if (!showAssignmentEditStatusAlerts()) {
                                $scope.close();
                                sendAssignmentEditMessage('success');
                            }
                        };
                        var editError = function(errorResponse) {
                            if (showAssignmentEditStatusAlerts()) {
                                if (errorResponse.data &&
                                    errorResponse.data.errorCode.indexOf(GOOGLE_CLASSROOM.EXTERNAL_ERROR) !== -1) {
                                    showGoogleErrorMessage(errorResponse);
                                    $scope.close();
                                    showInlineAlertOnExternalError(alertAssignmentId);
                                } else {
                                    var errorEditAlertMsg = lwcI18nFilter('program.errorNotification.generic.message');
                                    AlertService.addAlert('error', 'exclamation-sign', errorEditAlertMsg, 2);
                                    $scope.close();
                                    $route.reload();
                                }
                            }
                            if (!showAssignmentEditStatusAlerts()) {
                                $scope.close();
                                sendAssignmentEditMessage('error');
                            }
                        };

                        saveAssignment(editSuccess, editError);
                    } else {
                        $scope.assignment.assignees = _.filter($scope.assignees, function(assignee) {
                            setContainedGoogleClass(assignee);
                            return assignee.selected;
                        });
                        var successCreateAlertMsg;
                        if (isContainedGoogleClass) {
                            successCreateAlertMsg =
                                [
                                    '</strong>',
                                    lwcI18nFilter(
                                        'googleClassroom.createAssignment.successNotification.message'
                                    )
                                ].join(' ');
                        } else if ($scope.assignment.contentItem.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT &&
                            $scope.assignment.contentItem.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS) {
                            successCreateAlertMsg =
                                [
                                    '<strong>',
                                    lwcI18nFilter('prompt.successNotification.assignedPrompt.title'),
                                    '</strong>',
                                    lwcI18nFilter('prompt.successNotification.assignedPrompt.message')
                                ].join(' ');
                        } else {
                            successCreateAlertMsg =
                                [
                                    '<strong>',
                                    lwcI18nFilter(
                                        'program.createAssignment.successNotification.title'
                                    ),
                                    '</strong>',
                                    lwcI18nFilter(
                                        'program.createAssignment.successNotification.message'
                                    )
                                ].join(' ');
                        }
                        var createSuccess = function() {
                            if (showAssignmentCreateStatusAlerts()) {
                                var isPlaylist = $scope.assignment.contentItem.mediaType !==
                                    MEDIA_TYPE.PLAYLIST.toLowerCase();
                                var contentItemId = $scope.assignment.contentItem.id;
                                if ($scope.assignment.contentItem.fileType === ASSIGNMENT_CONSTANTS.FILE_TYPE.OPENED &&
                                    $scope.assignment.contentItem.originalEquellaItemId) {
                                    contentItemId = $scope.assignment.contentItem.originalEquellaItemId;
                                }
                                if (isPlaylist && !hasMultipleItems) {
                                    InlineAlertService.addAlert(contentItemId, {
                                        type: 'success', msg: successCreateAlertMsg
                                    });
                                }
                                $scope.$emit('assignmentModal.alert.toggle', {
                                    show: true,
                                    alertDetails: {
                                        msg: successCreateAlertMsg,
                                        type: 'success',
                                        icon: 'ok-sign'
                                    },
                                    assignedItem: $scope.assignment.contentItem
                                });
                                $scope.close();
                            }
                            if (!showAssignmentCreateStatusAlerts()) {
                                $scope.close();
                                sendAssignmentCreateStatus($scope.assignment.contentItem.id, 'success');
                            }
                        };
                        var createError = function(errorResponse) {
                            if (showAssignmentCreateStatusAlerts()) {
                                if (errorResponse.data &&
                                    errorResponse.data.errorCode.indexOf(GOOGLE_CLASSROOM.EXTERNAL_ERROR) !== -1) {
                                    showGoogleErrorMessage(errorResponse);
                                    $scope.close();
                                    showInlineAlertOnExternalError($scope.assignment.contentItem.id);
                                } else {
                                    var errorCreateAlertMsg = lwcI18nFilter('program.errorNotification.generic.message');
                                    AlertService.addAlert('error', 'exclamation-sign', errorCreateAlertMsg, 1);
                                    $scope.$emit('assignmentModal.alert.toggle', {
                                        show: true,
                                        alertDetails: {
                                            msg: errorCreateAlertMsg,
                                            type: 'error',
                                            icon: 'exclamation-sign'
                                        }
                                    });
                                    $scope.close();
                                }
                            }
                            if (!showAssignmentCreateStatusAlerts()) {
                                $scope.close();
                                sendAssignmentCreateStatus($scope.assignment.contentItem.id, 'error');
                            }
                        };

                        saveAssignment(createSuccess, createError);
                    }
                }

            }; // end SAVE

            // from INIT
            $scope.remediationDisplay = false;
            $scope.useRubricDisplay = false;
            $scope.hasOtherLanguages = false;
            $scope.isContentRTAEnabled = false;
            $scope.editingAlert = false;

            $scope.isTitleInvalid = function() {
                return $scope.assignmentForm.title.$invalid && $scope.assignPressed;
            };

            var shouldDisplayRubric = function(content) {
                var item = _.findWhere($scope.checkedItems, {id: content.id});
                if (($scope.checkedItems && item && content.rubricAvailable) ||
                    (!$scope.checkedItems && content.rubricAvailable)) {
                    $scope.useRubricDisplay = true;
                    return;
                }
                if (content.contentItems && content.contentItems.length) {
                    for (var childItemCounter = 0;
                         childItemCounter < content.contentItems.length && !$scope.useRubricDisplay;
                         childItemCounter++) {
                        shouldDisplayRubric(content.contentItems[childItemCounter]);
                    }
                }
            };

            var shouldAssignmentItemUseRubric = function(content) {
                shouldDisplayRubric(content);
                if ($scope.editMode) {
                    return $scope.item.useRubric;
                }
                if ($scope.createMode) {
                    return $scope.useRubricDisplay;
                }
            };

            $scope.areAssignmentDatesInvalid = function() {
                return $scope.assignPressed &&
                    (($scope.assignmentForm.startDate.$invalid ||  $scope.assignmentForm.dueDate.$invalid) ||
                        $scope.isStartTimeBeforeCurrentTime || $scope.isDueTimeBeforeStartTime);
            };

            $scope.onChangeUseRubric = function(checkboxValue) {
                if ($scope.productName) {
                    rubricEventTracking.onUseRubricForAssignmentSelection(checkboxValue,
                        $scope.productName);
                } else {
                    AssignmentUtil.getProgramHierarchy($scope.item, $scope.assignment.itemUuid)
                        .then(function(programHierarchy) {
                            $scope.productName = telemetryUtilitiesService.getProgramTitle(programHierarchy);
                            rubricEventTracking.onUseRubricForAssignmentSelection(checkboxValue,
                                $scope.productName);
                        });
                }
            };

            var iterateNextLevels = function(dataAll) {
                var item = _.findWhere($scope.checkedItems, { id: dataAll.id });
                if (($scope.checkedItems && item && dataAll.associatedRemediation !== null &&
                    dataAll.contentType === 'Assessment') ||
                    (!$scope.checkedItems && dataAll.associatedRemediation !== null &&
                    dataAll.contentType === 'Assessment')) {
                    $scope.remediationDisplay = true;
                } else if (dataAll.contentItems && dataAll.contentItems.length > 0) {
                    var chapter;
                    //Chapter Level
                    for (chapter = 0; chapter < dataAll.contentItems.length && !$scope.remediationDisplay; chapter++) {
                        iterateNextLevels(dataAll.contentItems[chapter]);
                    }
                }

                if ($scope.editMode) {
                    return $scope.item.allowRemediation;
                } else if ($scope.createMode) {
                    return $scope.remediationDisplay;
                }
            };

            $scope.hasOtherLanguage = false;
            var hasMultipleLanguages = function(dataAll) {
                if ($scope.editMode) {
                    return dataAll.hasOtherLanguages;
                } else if ($scope.createMode) {
                    var item = _.findWhere($scope.checkedItems, { id: dataAll.id });
                    if (($scope.checkedItems && item && dataAll.hasOtherLanguages) ||
                        (!$scope.checkedItems && dataAll.hasOtherLanguages)) {
                        $scope.hasOtherLanguage = true;
                    } else if (dataAll.contentItems && dataAll.contentItems.length > 0) {
                        var chapter;
                        for (chapter = 0; chapter < dataAll.contentItems.length &&
                        !$scope.hasOtherLanguage; chapter++) {
                            hasMultipleLanguages(dataAll.contentItems[chapter]);
                        }
                    }
                    return $scope.hasOtherLanguage;
                }
            };

            if ($scope.editMode) {
                //Start and due date validations
                var today = moment(),
                    legibleDates = $scope.item.$getLegibleDateObj();
                $scope.startDate = legibleDates.startDate.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY);
                $scope.dueDate = legibleDates.dueDate.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY);

                $scope.setTime = true;
                $scope.isAssignmentStarted = function() {
                    return legibleDates.startDate.isBefore(today) || legibleDates.startDate.isSame(today);
                };
                $scope.isAssignmentDue = function() {
                    return legibleDates.dueDate.isBefore(today);
                };
                $scope.isTodayOrBefore = function() {
                    return legibleDates.startDate.isBefore(moment().endOf(ASSIGNMENT_CONSTANTS.TIMES.DAY));
                };
                $scope.editingAlert = $scope.isAssignmentStarted();

                // Datepicker extras
                $scope.startDateOptions.minDate = $scope.isAssignmentStarted() ? legibleDates.startDate
                      .format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YY) : 0;
                $scope.startDateOptions.disabled = $scope.isAssignmentStarted();
                $scope.dueDateOptions.minDate = $scope.isAssignmentDue() ? legibleDates.dueDate
                      .format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YY) : 0;

                $scope.selectStartTime(legibleDates.startDate.format('LT').toLowerCase());
                $scope.selectDueTime(legibleDates.dueDate.format('LT').toLowerCase());

                if (legibleDates.remediationDueDate) {
                    $scope.remediationDueDate = legibleDates.remediationDueDate
                        .format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY);
                    $scope.remediationDueDateOptions.minDate = $scope.isAssignmentDue() ?
                        legibleDates.remediationDueDate.format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YY) : 0;
                    $scope.selectRemediationTime(legibleDates.remediationDueDate.format('LT').toLowerCase());
                } else {
                    $scope.remediationDueDate = 0;
                    $scope.selectRemediationTime(0);
                }
            }

            if ($scope.item.contentItem &&
                ($scope.item.contentItem.fileType === externalProviderName)) {
                $scope.item.contentItem.id = $scope.item.itemUuid;
            }

            var itemSource = angular.isDefined($scope.item.externalItemId) ?
                externalProviderName : ASSIGNMENT_CONSTANTS.ONESOURCE;
            // this flag is used to ensure that the assignment what is viewed (original or customized version)
            // is only assigned --> RGHT-63734
            var itemMode = true;

            var assignmentDataGenerator = AssignmentDataGenerator.getInstance(
                itemSource, $scope.item, $scope.createMode, itemMode
            );

            var prePopulateMultiSelectAssignes = function(assignees) {
                if (assignees.length > 0) {
                    return _.filter(assignees, function(assignee) {
                        if (_.contains($scope.selectedStudents, assignee.studentId) &&
                            $scope.classId === assignee.classId) {
                            assignee.selected = true;
                        }
                    });
                }
            };

            var getMultiSelectAssignmentData = function() {
                var assignmentObj = {
                    assignees: $scope.assignees,
                    classUuids: [],
                    contentItem: $scope.item,
                    itemUuid: '',
                    itemVersion: '',
                    title:'',
                    dueDate: null,
                    startDate: null,
                    instructions: null,
                    allowRemediation: false,
                    allowMultipleLanguage: false,
                    includeRRSActivity: false
                };
                return assignmentObj;
            };

            var isAssignmentFromPlaylist = $scope.item.mediaType === MEDIA_TYPE.PLAYLIST.toLowerCase();
            var assignmentObj = !isAssignmentFromPlaylist && $scope.assigntype === 'multiselect' && $scope.item.contentItems.length > 1 ?
                getMultiSelectAssignmentData() : assignmentDataGenerator.getAssignmentData();

            // Make it an assignment so things starts populating
            $scope.assignment = new Assignment(assignmentObj);
            $scope.assignment.removedAssignees = []; // Assignee removed before assignment start date)

            $scope.closeEditingAlert = function() {
                $scope.editingAlert = false;
            };

            var filterAssignees = function(assignees) {
                var userList = $rootScope.currentUser.getAttribute('classes.withoutPrograms');
                if (!userList || userList.length < 1) { return assignees; }

                return _.filter(assignees, function(assignee) {
                    return !_.isEmpty(assignee.productIds) || !(_.contains(userList, assignee.classId));
                });
            };

            assignmentDataGenerator.getAssignees().then(function(assignees) {
                angular.extend($scope.assignees, filterAssignees(assignees));

                if ($scope.assigntype === 'multiselect') {
                    angular.extend($scope.assignees, prePopulateMultiSelectAssignes($scope.assignees));
                }

                if ($scope.assignees.length > 0 && $scope.editMode) {
                    assignmentDataGenerator.getPreSelectedAssignees($scope.item, $scope.assignees).then(
                        function(preSelectedItems) {
                            angular.extend($scope.preSelectedItems, preSelectedItems);
                            $scope.$broadcast('typeAndSelect.selectPrePopulatedItems', $scope.preSelectedItems);
                        });
                }
            });

            var extractContent = function(content) {
                // Below acronym RTA is Round Trip Assignment
                $scope.isContentRTAEnabled = (content.mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION);

                if ($scope.createMode) {
                    $scope.assignment.allowMultipleLanguage = hasMultipleLanguages(content);
                    $scope.assignment.includeRRSActivity = $scope.isContentRTAEnabled;
                }
                $scope.assignment.allowRemediation = iterateNextLevels(content);
                $scope.assignment.useRubric = shouldAssignmentItemUseRubric(content);
                $scope.disableSave = false;
                $scope.hasOtherLanguages = hasMultipleLanguages(content);
            };

            var getCustomContent = function() {
                var params =  _.map($scope.multiSelectRequest, function(item) {
                    return item.itemUuid;
                });
                assignmentDataGenerator.getCustomContent(params)
                .then(function(content) {
                    extractContent(content);
                }, function() {
                    $scope.disableSave = false;
                });
            };

            var getCustomContentforEdit = function() {
                var params = _.map($scope.item.contentItem.contentItems, function(item) {
                    return item.id;
                });
                assignmentDataGenerator.getCustomContent(params)
                .then(function(content) {
                    extractContent(content);
                }, function() {
                    $scope.disableSave = false;
                });
            };

            var getContent = function() {
                assignmentDataGenerator.getContent()
                .then(function(content) {
                    extractContent(content);
                }, function() {
                    $scope.disableSave = false;
                });
            };
            if ($scope.assigntype === 'multiselect' && $scope.item.contentItems.length > 1) {
                getCustomContent();
            } else if ($scope.mode === 'edit' &&
                ($scope.item.type === 'MULTIRESOURCE' || $scope.item.type === 'PLAYLIST')) {
                if ($scope.item.type === 'PLAYLIST') {
                    $scope.mediaTypeOverride = MEDIA_TYPE.PLAYLIST.toLowerCase();
                }
                getCustomContentforEdit();
            } else {
                getContent();
            }

            $scope.$on('$destroy', function() {
                elementsToCleanUp.forEach(function(element) {
                    element.off();
                });
                elementsToCleanUp = null;
            });
        }]);
