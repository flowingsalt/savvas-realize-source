//assignmentUtil.svc.js
angular.module('Realize.assignment.utilService', [
    'Realize.assignment.facadeService',
    'RealizeDataServices', //TODO: Use only User service module when user.js is refactor
    'Realize.common.optionalFeaturesService',
    'Realize.user.currentUser',
    'webStorageModule',
    'rlzComponents.components.googleClassroom',
    'rlzComponents.components.googleClassroom.constants',
    'rlzComponents.components.dataViewerModal',
])
    .service('AssignmentUtil', ['$q', 'User', '$location', 'OptionalFeatures', '$currentUser', '$filter',
        'ProgramService', 'ASSIGNMENT_CONSTANTS', 'MEDIA_TYPE', 'webStorage', 'googleClassroomService',
        'GOOGLE_CLASSROOM', 'GoogleClassroomConstants', 'lwcI18nFilter', 'Assessment', 'dataViewerModal',
        function($q, User, $location, OptionalFeatures, $currentUser, $filter, ProgramService, ASSIGNMENT_CONSTANTS,
        MEDIA_TYPE, webStorage, googleClassroomService, GOOGLE_CLASSROOM, GoogleClassroomConstants, lwcI18nFilter,
        Assessment, dataViewerModal) {
        'use strict';
        var remediationContainer;
        var assignmentListingPageNumber = 'ASSIGNMENT_LISTING.REQUESTFILTER.PAGE';
        /*
         * Given an assignTo collection and the current classId,
         * the getAssigneeIdsFromItemAssignedToCollection perform a data conversion which is further used for
         * getAssigneeList() and getAssigneesName() methods
         * returns an object of assignee with classUuids, groupUuids and studentUuids as keys , empty if none
         * {
         *   classUuids: [classId],
         *   groupUuids: [groupId...],
         *   studentUuids: [studentIds]
         * }
        */
        this.getAssigneeIdsFromItemAssignedToCollection = function(assignedTo, currentClassClassId) {
            var classIds = [], groupIds = [], studentIds = [], assignClassId;

            angular.forEach(assignedTo, function(assignedToObject) {
                if (assignedToObject.classUuid && !assignedToObject.groupUuid && !assignedToObject.studentUuid) {
                    classIds.push(assignedToObject.classUuid);
                }

                if (assignedToObject.groupUuid) {
                    groupIds.push(assignedToObject.groupUuid);

                }
                if (assignedToObject.studentUuid) {
                    studentIds.push(assignedToObject.studentUuid);
                }
            });

            classIds = _.uniq(classIds);

            angular.forEach(classIds, function(classId) {
                if (classId === currentClassClassId) {
                    assignClassId = currentClassClassId;
                }
            });

            groupIds = _.uniq(groupIds);
            studentIds = _.uniq(studentIds);

            return {
                classUuids: assignClassId,
                groupUuids: groupIds,
                studentUuids: studentIds
            };
        };

        /*
         * Given an assignee collection, class CurrentRoster and GroupData
         * the getAssigneeList() further call the getAssigneesName() and formulate the assigneeList
         * of Current Class, Group, Students as string
         * returns an string of assignee display name (sorted), empty if none
        */
        this.getAssigneeList = function(assignee, CurrentRoster, GroupData) {
            var assigneesName, assigneeList = [];
            if (assignee) {
                assigneesName = this.getAssigneesName(
                    assignee.classUuids, assignee.groupUuids, assignee.studentUuids,
                    CurrentRoster.students, CurrentRoster, GroupData
                );

                if (assigneesName.missingStudentIds.length > 0) {
                    User.getUsersByIds(assigneesName.missingStudentIds).then(function(result) {
                        var retrievedStudents = _.filter(result, function(result) {
                            return result !== null;
                        });
                        assigneesName.students = assigneesName.students.concat(_.pluck(retrievedStudents, 'lastFirst'));
                        assigneesName.students = _.sortBy(assigneesName.students, function(student) {
                            return student.toLowerCase();
                        });
                    });
                }

                assigneeList = assigneeList.concat(assigneesName.classes, assigneesName.groups, assigneesName.students);
                return assigneeList.join(' | ');
            }
        };

        /*
         * Given an assignment and the current classRoster + groupList
         * returns an object of assignee display name (sorted), empty if none
         * {
         *   classes: [className],
         *   groups: [groupName...],
         *   students: [lastFirst...]
         * }
        */
        this.getAssigneesName = function(classUuids, groupUuids, studentUuids,
            studentMetadata, classRoster, groupsList) {
            var classes = [], groups = [], students = [], missingStudentIds = [];

            if (classUuids && classUuids.length > 0) {
                classes.push(classRoster.className);
            }

            if (groupUuids) {
                angular.forEach(groupUuids, function(groupId) {
                    var group = _.findWhere(groupsList, {groupId: groupId});
                    if (group) {
                        groups.push(group.groupName);
                    }
                });
            }

            if (studentUuids) {
                angular.forEach(studentUuids, function(studentId) {
                    var studentFoundInClassRoster = _.findWhere(classRoster.students, {userId: studentId});

                    if (studentFoundInClassRoster) {
                        students.push(studentFoundInClassRoster.lastFirst);
                    } else {
                        var studentFoundInMetadata = _.find(studentMetadata, function(metadata) {
                            return angular.isDefined(metadata.studentInfo) && metadata.studentInfo.userId === studentId;
                        });

                        if (studentFoundInMetadata && studentFoundInMetadata.studentInfo.lastFirst) {
                            students.push(studentFoundInMetadata.studentInfo.lastFirst);
                        } else { //Deleted from class
                            missingStudentIds.push(studentId);
                            //Let caller handle this so assignment is not tied to user service
                        }
                    }
                });
            }

            return {
                classes: classes,
                groups: _.sortBy(groups, function(group) {
                    return group.toLowerCase();
                }),
                students: _.sortBy(students, function(student) {
                    return student.toLowerCase();
                }),
                missingStudentIds: missingStudentIds
            };

        };

        this.generateNotebookReviewLink = function(assignment, userAssignmentId, isClassTab) {
            var currentPath = $location.path(),
                endPart = 'allstudents/' + userAssignmentId + '/review',
                allStudents = 'allstudents',
                generatedPath;
            if ($currentUser.isStudent) {
                generatedPath = [
                    currentPath,
                    endPart
                ].join('/');
            } else {
                if (isClassTab) {
                    if (currentPath.indexOf('/gradeInput') > -1) {
                        $location.search('gradeInput', true);
                    } else {
                        $location.search('gradeInput', null);
                    }
                    currentPath = currentPath.split(allStudents)[0] + allStudents;
                    generatedPath = [
                        currentPath,
                        userAssignmentId,
                        'review'
                    ].join('/');
                } else {
                    generatedPath = [
                        currentPath.substring(0, currentPath.indexOf('/student')),
                        'assignments',
                        assignment.assignmentId,
                        endPart
                    ].join('/');
                }
            }
            return generatedPath;
        };

        //TODO There should be only one method to check notebook integration.
        //enhance this method based on other conditions.
        this.isNotebookEnabled = function(assignment, contentItem) {
            var isNotebookEnabled = OptionalFeatures.isAvailable('notebook.integration.enabled') &&
                assignment.includeRRSActivity && this.isCompletedOrSubmitted(assignment);
            if (contentItem) {
                return isNotebookEnabled && contentItem.isRRS();
            }
            return isNotebookEnabled && assignment.isRRS();
        };

        this.generateNotebookBackLink = function(studentId) {
            var next,
                params = $location.search() || {},
                gradeInput;
            if ($currentUser.isStudent) {
                next = $location.path().split('/allstudents')[0];
                $location.search('status', params.status);
            } else {
                if (params.activeTab) {
                    next = [
                        $location.path().split('/assignments')[0],
                        'student',
                        studentId,
                        'assignments'
                    ].join('/');
                } else {
                    gradeInput = params.gradeInput ? '/gradeInput' : '';
                    next = $location.path().split('/allstudents')[0] + '/allstudents' + gradeInput;
                }
            }
            return next;
        };

        this.generateRRSSCOReviewLink = function(item, assignment, studentId, isClassTab) {
            var basePath,
                metadata = assignment.$findItemMetadata(item.id, studentId);
            if ($currentUser.isTeacher) {
                var objectId = isClassTab ? studentId : assignment.assignmentId;
                basePath = $location.path() + '/' + objectId;
            } else {
                basePath = $location.path();
            }

            return [
                basePath,
                'RRSSCOReview',
                item.id,
                item.version,
                'userAssignmentId',
                metadata.userAssignmentId
            ].join('/');
        };

        this.gotoRRSSCOReviewPage = function(item, assignment, studentId, isClassTab) {
            var path = this.generateRRSSCOReviewLink(item, assignment, studentId, isClassTab);
            $location.path(path);
        };

        this.gotoNotebookReviewPage = function(assignment, studentId, lessonItem, isClassTab) {
            var id,
                studentMetadata,
                path;
            if (lessonItem) {
                id = lessonItem.id;
                $location.search('contentId', id);
            } else {
                id = assignment.contentItem.id;
            }
            studentMetadata = assignment.$findItemMetadata(id, studentId);
            path = this.generateNotebookReviewLink(assignment, studentMetadata.userAssignmentId, isClassTab);
            $location.path(path);
        };

        this.showRRSActivities = function(assignment, contentItem) {
            return assignment.includeRRSActivity && contentItem.isRRS() &&
                contentItem.RRSActivities && contentItem.RRSActivities.length > 0 &&
                    this.isCompletedOrSubmitted(assignment);
        };

        this.showRRSSCO = function(assignment, contentItem, studentId) {
            var studentMetadata = assignment.$findItemMetadata(contentItem.id, studentId);
            return !!studentMetadata;
        };

        this.showScoreForRRSSCO = function(assignment, contentItem, studentId) {
            var studentMetadata = assignment.$findItemMetadata(contentItem.id, studentId);
            return studentMetadata && studentMetadata.userAssignmentDataList &&
                studentMetadata.userAssignmentDataList.length > 0;
        };

        this.getScoreForRRSSCO = function(assignment, contentItem, studentId) {
            var studentMetadata = assignment.$findItemMetadata(contentItem.id, studentId),
                scoreData = studentMetadata.userAssignmentDataList[0];

            return $filter('number')(scoreData.score, 0);
        };

        this.isSubmitted = function(assignment) {
            return assignment.isSubmitted() && $currentUser.isStudent;
        };

        this.isCompletedOrSubmitted = function(assignment) {
            if ($currentUser.isStudent) {
                return assignment.$isCompleted() || assignment.isSubmitted();
            } else {
                return $currentUser.isTeacher;
            }
        };

        this.getHours = function() {
            var hours = [],
                getSuffix = function(hour) {
                    return hour < 12 ? 'am' : 'pm';
                },
                i;
            for (i = 0; i < 24; i++) {
                var hour = i % 12,
                    hourValue = hour === 0 ? '12' : hour,
                    suffixValue = getSuffix(i);
                hours.push(hourValue + ':00 ' + suffixValue);
                hours.push(hourValue + ':30 ' + suffixValue);
            }
            hours.push(ASSIGNMENT_CONSTANTS.TIMES.MAX_TIME);
            return hours;
        };

        this.sortByStudentName = function(list) {
            return _.sortBy(list, function(student) {
                return student.studentInfo.lastFirst.toLowerCase();
            });
        };

        this.navigateToSourceProgram = function(url) {
            $location.path(url);
        };

        this.getAssignmentWithProgramHierarchy = function(assignment) {
            if (assignment.programHierarchy && assignment.programHierarchy.length > 0) {
                var breadcrumbDetails = [];
                _.forEach(assignment.programHierarchy, function(hierarchy) {
                    if (hierarchy.containerMediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        var breadcrumbItem = {
                            id: hierarchy.parentItemUuid,
                            title: hierarchy.containerTitle,
                            url: hierarchy.path
                        };
                        breadcrumbDetails.push(breadcrumbItem);
                    }
                });
                if (!_.isEmpty(breadcrumbDetails)) {
                    assignment.breadcrumb = breadcrumbDetails;
                }
            }
            return assignment;
        };

        this.setRemediationContainerDetails = function(content) {
            remediationContainer = content;
        };

        var getProgramHierarchyWithTitle = function(hierarchyList, programHierarchyList) {
            return ProgramService.get(hierarchyList[2], hierarchyList[3])
                .then(function(currentProgram) {
                    if (currentProgram) {
                        programHierarchyList[0].containerTitle = currentProgram.title;
                        // jscs:disable maximumLineLength
                        if (programHierarchyList.length >= 2 && currentProgram.contentItems && currentProgram.contentItems.length >= 1) {
                            var secondHierarchyTitle = _.find(currentProgram.contentItems, function(item) {
                                return item.id === programHierarchyList[1].parentItemUuid;
                            });
                            if (secondHierarchyTitle && secondHierarchyTitle.title) {
                                programHierarchyList[1].containerTitle = secondHierarchyTitle.title;
                            }
                        }
                        return programHierarchyList.reverse();
                    } else {
                        return programHierarchyList.reverse();
                    }
                });
        };

        var getProgramHierarchyTOCFlow = function(hierarchyList, itemId) {
            var hierarchyLength = Math.floor(hierarchyList.length / 3);
            var isRemediation = hierarchyList.indexOf(MEDIA_TYPE.REMEDIATION.toLowerCase()) !== -1;
            var programHierarchyList = [];
            var chunkIndex = 1;
            var distanceFrom = isRemediation ? hierarchyLength + 1 : hierarchyLength;
            _.times(hierarchyLength, function() {
                var programHierarchyObj = {
                    parentItemUuid: hierarchyList[chunkIndex + 1],
                    distanceFrom: distanceFrom,
                    root: distanceFrom === (isRemediation ? hierarchyLength + 1 : hierarchyLength) ? true : false,
                    containerMediaType: hierarchyList[chunkIndex]
                };
                programHierarchyList.push(programHierarchyObj);
                chunkIndex = chunkIndex + 3;
                distanceFrom = distanceFrom - 1;
            });

            programHierarchyList = _.filter(programHierarchyList, function(hierarchyItem) {
                return hierarchyItem.parentItemUuid !== itemId;
            });

            if (isRemediation) {
                var remediationProgramHierarchyObj = {
                    parentItemUuid: remediationContainer ? remediationContainer.id : '',
                    distanceFrom: 1,
                    root: false,
                    containerMediaType: MEDIA_TYPE.REMEDIATION,
                    containerTitle: remediationContainer ? remediationContainer.title : ''
                };
                programHierarchyList.push(remediationProgramHierarchyObj);
            }
            return getProgramHierarchyWithTitle(hierarchyList, programHierarchyList);
        };

        var filterProgramHierarchySearchFlow = function(fromDetails) {
            var programHierarchy = [];
            for (var hierarchyIndex = 0; hierarchyIndex < fromDetails.length; hierarchyIndex++) {
                if (programHierarchy.length > 0 && fromDetails[hierarchyIndex].distanceFrom === 1) {
                    break;
                }
                programHierarchy.push(fromDetails[hierarchyIndex]);
            }
            return programHierarchy;
        };

        this.getProgramHierarchy = function(contentItem, itemId) {
            var path = $location.path();
            var isTocFlow = path.indexOf('/program') !== -1;
            var isMyContentFlow = path.indexOf('/myContent') !== -1;
            var isLesson = path.indexOf('/lesson') !== -1;
            var isResources = path.indexOf('/resources') !== -1;
            var isStandards = path.indexOf('/standards') !== -1;
            var isLeveledReaders = path.indexOf('/leveledreaders') !== -1;
            var isSearchLesson = path.indexOf('/search/lesson') !== -1;
            var isAdaptivehomework = path.indexOf('/search/adaptivehomework') !== -1;
            var isDiscussionprompt = path.indexOf('/search/discussionprompt') !== -1;
            var isRemediation = path.indexOf('/remediation') !== -1;
            var isProgramAdditionalScenario = isResources || isStandards || isLeveledReaders;
            var hierarchyList = $location.url().split('/');
            if (isTocFlow && !isMyContentFlow && !isProgramAdditionalScenario) {
                return getProgramHierarchyTOCFlow(hierarchyList, itemId);
            } else if (isTocFlow && isMyContentFlow && !isProgramAdditionalScenario) {
                hierarchyList.pop(); // Remove myContent from hierarchy list
                return getProgramHierarchyTOCFlow(hierarchyList, itemId);
            } else {
                var programHierarchy;
                var contentFromDetails = webStorage.get('contentFromDetails');
                var isResourcesLesson = isResources && isLesson;
                var isStandardsLesson = isStandards && isLesson;
                var isLeveledReadersLesson = isLeveledReaders && isLesson;
                var isLessonAdditionalScenario = isResourcesLesson || isStandardsLesson || isLeveledReadersLesson;
                if ((isSearchLesson || isAdaptivehomework || isDiscussionprompt || isRemediation || isLessonAdditionalScenario) && contentFromDetails) {
                    programHierarchy = filterProgramHierarchySearchFlow(contentFromDetails);
                } else {
                    var isProgramHierarchy = contentItem.fromDetails && contentItem.fromDetails.length > 0;
                    programHierarchy = isProgramHierarchy ? filterProgramHierarchySearchFlow(contentItem.fromDetails) : null;
                }
                return $q.resolve(programHierarchy);
            }
        };

        this.redirectToRealizeSyncWebApp = function() {
            var trackRedirectToRealizeSyncWebAppTelemetryObject = {
                area: GOOGLE_CLASSROOM.SETTINGS,
                page: GOOGLE_CLASSROOM.ACCOUNT_LINKING,
                product: GoogleClassroomConstants.EVENT_TYPE.PROGRAM_NOT_AVAILABLE,
                name: GOOGLE_CLASSROOM.CONNECT_CLASS,
                description: GOOGLE_CLASSROOM.GOOGLE_CONNECT
            };
            googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl(),
                GoogleClassroomConstants.LAUNCH, trackRedirectToRealizeSyncWebAppTelemetryObject);
        };

        var checkIfScoredAssignment = function(userAssignmentDataList) {
            return userAssignmentDataList.some(function(userAssignmentData) {
                return userAssignmentData.scoreSent;
            });
        };

        this.setDataLinkDetails = function(assignment) {
            var showDataLink = false;
            var sequenceTypeStudentList = [];
            var testTypeStudentList = [];
            var isSequenceExist = false;
            angular.forEach(assignment.studentMetadata, function(studentAssignment) {
                if (studentAssignment.markCompleted &&
                    checkIfScoredAssignment(studentAssignment.userAssignmentDataList)) {
                    if (studentAssignment.itemType === 'Sequence' &&
                        sequenceTypeStudentList.indexOf(studentAssignment.studentUuid) === -1) {
                        sequenceTypeStudentList.push(studentAssignment.studentUuid);
                    } else if (studentAssignment.itemType === 'TEST' &&
                        testTypeStudentList.indexOf(studentAssignment.studentUuid) === -1) {
                        testTypeStudentList.push(studentAssignment.studentUuid);
                    }
                }
                if (studentAssignment.itemType === 'Sequence' && !isSequenceExist) {
                    isSequenceExist = true;
                }
            });
            if (isSequenceExist) {
                showDataLink = sequenceTypeStudentList.some(function(studentUuid) {
                    return testTypeStudentList.indexOf(studentUuid) > -1;
                });
            } else {
                showDataLink = testTypeStudentList.length > 0;
            }
            assignment.showDataLink = showDataLink;
            assignment.isSequenceExist = isSequenceExist;
        };

        this.showUnableToAccessExternalAccountError = function() {
            return {
                msg: lwcI18nFilter('googleClassroom.unableToAccess'),
                action: {
                    actionId: 'reconnectGoogleClassRoom',
                    actionClass: 'syncFailed__reconnectGoogleClassRoom',
                    actionLabel: lwcI18nFilter('googleClassroom.reconnectYourGoogleClass'),
                    onCustomAction: function() {
                        this.redirectToRealizeSyncWebApp();
                    }
                }
            };
        };

        this.showAssignmentSyncGenericExternalError = function() {
            return {
                msg: [
                    lwcI18nFilter('googleClassroom.somethingWentWrong'),
                    lwcI18nFilter('googleClassroom.unableToSync')
                ].join(' ')
            };
        };

        this.showAssignmentCreateGenericExternalError = function() {
            return {
                msg: [
                    lwcI18nFilter('googleClassroom.notSyncedWithGoogleClassroom'),
                    lwcI18nFilter('googleClassroom.syncAssignment')
                ].join(' ')
            };
        };

        this.showAssignmentCreateExternalError = function() {
            return {
                msg: lwcI18nFilter('googleClassroom.createAssignment.errorNotification.message')
            };
        };

        this.showAssignmentEditExternalError = function() {
            return {
                msg: lwcI18nFilter('googleClassroom.editAssignment.errorNotification.message')
            };
        };

        var getFormattedDate = function(date) {
            return $filter('date')(date, 'MM-DD-YYYY');
        };

        var closeDataModel = function() {
            return dataViewerModal.deactivate();
        };

        var showModalPopUpForDataLink = function(assignment) {
            var cssClassName = 'assessmentLanding__page';
            var closeButton = {
                label: lwcI18nFilter('global.modal.close.a11y'),
                action: function() {
                    closeDataModel();
                },
                className: 'modal__close',
                disabled: false,
            };
            var buttons = [
                closeButton,
            ];
            dataViewerModal.activate({
                cssClass: cssClassName,
                heading: lwcI18nFilter('dataViewerModal.heading.message'),
                description: assignment,
                buttons: buttons,
                closeButtonLabel: lwcI18nFilter('global.modal.close.a11y'),
                closeAction: function() {
                    closeDataModel();
                },
            });
        };

        this.generateAndRedirectToReportScreen = function(assignment, itemUuid, itemVersion, dataModalOpen) {
            itemUuid = !itemUuid ? assignment.itemUuid : itemUuid;
            itemVersion = !itemVersion ? assignment.itemVersion : itemVersion;
            var deferred = $q.defer();
            Assessment.getInfo(itemUuid, itemVersion).then(function(response) {
                webStorage.add(ASSIGNMENT_CONSTANTS.DEEP_LINKED_URL, $location.path());
                var path = [
                    'data',
                    $location.path().split('/')[2],
                    'overview',
                    'assignment',
                    assignment.assignmentId,
                    'recap',
                    response.assessmentId,
                    'itemUuid',
                    itemUuid,
                    'student',
                    getFormattedDate(assignment.startDate),
                    getFormattedDate(assignment.dueDate)
                ].join('/');
                if (dataModalOpen) {
                    deferred.resolve(path);
                } else {
                    $location.path(path);
                }
            }).catch(function(error) {
                return deferred.reject(error);
            });
            return deferred.promise;
        };

        var fetchItemUuidAndItemVersion = function(assignment) {
            var itemUuid;
            var itemVersion;
            angular.forEach(assignment.studentMetadata, function(userAssignment) {
                if (userAssignment.itemType === 'TEST' && userAssignment.markCompleted) {
                    angular.forEach(userAssignment.userAssignmentLanguageList, function(userAssignmentLanguage) {
                        if (userAssignmentLanguage.isSelected) {
                            itemUuid = userAssignmentLanguage.itemUuid;
                            itemVersion = userAssignmentLanguage.itemVersion;
                        }
                    });
                }
            });
            return [itemUuid, itemVersion];
        };

        var showAssessmentModal = function(assignment) {
            var testTypeStudentList = [];
            var showAssessmentModal = false;
            angular.forEach(assignment.studentMetadata, function(userAssignment) {
                if (userAssignment.itemType === 'TEST') {
                    if (testTypeStudentList.indexOf(userAssignment.studentUuid) === -1) {
                        testTypeStudentList.push(userAssignment.studentUuid);
                    } else {
                        showAssessmentModal =  true;
                    }
                }
            });
            return showAssessmentModal;
        };

        this.redirectToReportScreen = function(assignment) {
            if (!assignment.isSequenceExist) {
                this.generateAndRedirectToReportScreen(assignment);
            } else {
                if (!showAssessmentModal(assignment)) {
                    var assignmentData = fetchItemUuidAndItemVersion(assignment);
                    this.generateAndRedirectToReportScreen(assignment, assignmentData[0], assignmentData[1]);
                } else {
                    showModalPopUpForDataLink(assignment);
                }
            }
        };

        this.getPageNumber = function(classId, assignmentStatus) {
            var pageList = webStorage.get(assignmentListingPageNumber);
            var pageObjects = (pageList !== undefined && pageList !== null) ?
                JSON.parse(pageList) : [];
            var requestFilter = pageObjects.filter(function(payload) {
                return payload.classId === classId && payload.status === assignmentStatus;
            });
            return requestFilter && requestFilter.length && requestFilter[0].pageNumber ?
                requestFilter[0].pageNumber : 1;
        };

        this.setPageNumber = function(classId, pageNumber, assignmentStatus) {
            var pageList = webStorage.get(assignmentListingPageNumber);
            var pageObjects = (pageList !== undefined && pageList !== null) ?
                JSON.parse(pageList) : [];
            var pageObjectsWithClassId = pageObjects.filter(function(data) {
                return data.classId === classId && data.status === assignmentStatus;
            });

            if (pageObjectsWithClassId && pageObjectsWithClassId.length > 0 &&
                    pageObjectsWithClassId[0].pageNumber) {
                pageObjectsWithClassId[0].pageNumber = pageNumber;
                pageObjectsWithClassId[0].status = assignmentStatus;
            } else {
                pageObjects.push({ classId: classId, pageNumber: pageNumber, status: assignmentStatus });
            }

            webStorage.add(assignmentListingPageNumber, JSON.stringify(pageObjects));
        };
    }]);
