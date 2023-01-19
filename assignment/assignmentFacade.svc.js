angular.module('Realize.assignment.facadeService', [
    'Realize.assignment.utilService',
    'RealizeDataServices',
    'Realize.user.currentUser',
    'Realize.classRoster.classDataService',
    'Realize.content.model.contentItem',
    'Realize.content.model.openEdItem',
    'Realize.assignment.model.assignment',
    'Realize.ExternalItem',
    'Realize.assignment.viewOptions',
    'realize.core.isoDateService',
    'rlzComponents.components.i18n',
    'webStorageModule'
])
    .factory('AssignmentFacadeService', [
        '$http',
        '$log',
        '$currentUser',
        '$q',
        'Content',
        'REST_PATH',
        '$location',
        'ASSIGNMENT_CONSTANTS',
        'ClassRoster',
        'Messages',
        'OpenEdItem',
        'ISODateService',
        'numberFilter',
        'AssignmentUtil',
        'ClassDataService',
        'Assignment',
        'ExternalItemStrategy',
        'AssignmentViewOptions',
        'lwcAssignment',
        'lwcI18nFilter',
        'webStorage',
        function($http, $log, $currentUser, $q, Content, restPath, $location, ASSIGNMENT_CONSTANTS,
                 ClassRoster, Messages, OpenEdItem, ISODateService, numberFilter, AssignmentUtil, ClassDataService,
                 Assignment, ExternalItemStrategy, AssignmentViewOptions, lwcAssignment, lwcI18nFilter, webStorage) {
            'use strict';

            var pastDueAssignmentWarningsDismissed = [];
            var standardMasteryByClass = 'standardMasteryByClass';

            function service(json) {
                $log.warn('Y U NO USE Assignment model');
                return Assignment(json);
            }

            //HELPERS

            var getRejectObject = function(err) {
                    var rejectObj = {type: 'redirect'};
                    if (err.data && err.data.errorCode === '404') { //Missing equella item
                        rejectObj.path = 'error/item-not-found';
                    } else {
                        rejectObj.path = 'error/default';
                    }
                    return rejectObj;
                },
                isAssignmentDataFromOpenEd = function(assignment) {
                    return !!(assignment.contentItem &&
                        assignment.contentItem.externalSource === ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED);
                },
                wrapAssignments = function(responseData) {
                    var assignmentList = responseData.assignments;
                    angular.forEach(assignmentList, function(assignment, index) {
                        assignmentList[index] = new Assignment(assignment);
                    });
                    return responseData;
                },
                getIsoFilter = function(filter) {
                    var isoFilter = {};
                    angular.extend(isoFilter, filter);
                    if (isoFilter.startDate) {
                        isoFilter.startDate = ISODateService.toStartOfDayStringWithZone(new Date(isoFilter.startDate));
                    }
                    if (isoFilter.endDate) {
                        isoFilter.endDate = ISODateService.toStartOfNextDayStringWithZone(new Date(isoFilter.endDate));
                    }
                    if (isoFilter.dueDateStartRange) {
                        isoFilter.dueDateStartRange = ISODateService.toStartOfDayStringWithZone(
                            new Date(isoFilter.dueDateStartRange)
                        );
                    }
                    if (isoFilter.dueDateEndRange) {
                        isoFilter.dueDateEndRange = ISODateService.toStartOfNextDayStringWithZone(
                            new Date(isoFilter.dueDateEndRange)
                        );
                    }
                    return isoFilter;
                },
                metadataHasScore = function(metadata) {
                    return metadata && metadata.userAssignmentDataList && metadata.userAssignmentDataList.length > 0;
                },
                updateAttachmentStatus = function(userAssignmentId, status) {
                    var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId + '/attachments/status';

                    return $http({
                        url: url,
                        method: 'PUT',
                        params: {'status': status}
                    }).then(function(response) {
                        return response.data;
                    });
                },
                hideUnhide = function(assignmentId, classId, status, isGoogleClass) {
                    var url = restPath + '/v2/classes/' + classId + '/assignments/' + assignmentId + '/status';
                    return $http({
                        url: url,
                        method: 'PUT',
                        params: {status: status, isGoogleImportedClass: isGoogleClass}
                    });
                },
                // Transform request for save/edit assignment
                assigneeTransformReq = function(data, programHierarchyData) {
                    if (!angular.isObject(data)) {
                        return data;
                    }

                    //Prepare time fields for entry
                    var skipKeys = [
                            'assignees', 'assignedTo', 'studentClass', 'removedAssignees', 'contentItem',
                            'OpenEdItem', 'assignmentSource', 'multiSelectRequest'
                        ],
                        assignmentStringArray = [],
                        assignToStringArray = [],
                        assigneePayload,
                        assignmentPayload,
                        newAssignedToStringArray,
                        newMultiSelectAssignArray,
                        serializeAssignees = function(assignees, prefix, inAssignmentObj) {
                            var assigneeStringArray = [];
                            assignees.sort(function(a, b) {
                                return (a.type.toLowerCase()).localeCompare(b.type.toLowerCase());
                            });

                            angular.forEach(assignees, function(assignee, index) {
                                var keyPrefix = encodeURIComponent(prefix + '[' + index + ']');
                                if (inAssignmentObj) {
                                    keyPrefix = 'assignment.' + keyPrefix;
                                }
                                assigneeStringArray.push(assignee.$getSerializedString(keyPrefix));
                            });
                            return assigneeStringArray;
                        },
                        serializeMultiSelect = function(assignees, prefix) {
                            var assigneeStringArray = [];

                            angular.forEach(assignees, function(assignee, index) {
                                var keyPrefix = encodeURIComponent(prefix + '[' + index + ']');
                                var itemUuidVal  = keyPrefix + '.itemUuid' + '=' + assignee.itemUuid;
                                var itemVersionVal  = itemUuidVal + '&' + keyPrefix + '.itemVersion' +
                                    '=' + assignee.itemVersion;
                                assigneeStringArray.push(itemVersionVal);
                            });
                            return assigneeStringArray;
                        };

                    angular.forEach(data, function(value, key) {
                        if (!angular.isFunction(value) &&
                            !_.contains(skipKeys, key) &&
                            value && value.length !== 0) {
                            assignmentStringArray.push ('assignment.' + key + '=' + encodeURIComponent(value));
                        }
                    });

                    if (angular.isDefined(data.externalSourceId)) {
                        var externalSourceName = ExternalItemStrategy.getExternalProviderName();
                        var externalSourceParamArray = [
                            'externalResource=' + true,
                            'externalItem.externalSource=' + externalSourceName,
                            'externalItem.externalId=' + data.externalSourceId,
                            'externalItem.title=' + data.contentItem.title,
                            'externalItem.contribSource=' + externalSourceName,
                            'externalItem.thumbnailUrls[0]=' + data.contentItem.thumbnailUrls[0]
                        ];
                        if (externalSourceName === ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED) {
                            var externalOpenEdSourceParamArray = [
                                'externalItem.fileLocation=' + data.contentItem.url,
                                'externalItem.mediaType=' + data.contentItem.learningResourceType[0]
                            ];
                            assignmentStringArray = assignmentStringArray.concat(externalOpenEdSourceParamArray);
                        }
                        assignmentStringArray = assignmentStringArray.concat(externalSourceParamArray);
                    }

                    assignmentPayload = assignmentStringArray.join('&');

                    // Create serialized assignees
                    newAssignedToStringArray = serializeAssignees(data.assignees, 'newAssignedTo');
                    if (data.removedAssignees && data.removedAssignees.length > 0) {
                        assignToStringArray = serializeAssignees(data.removedAssignees, 'assignedTo', true);
                    }

                    if (data.multiSelectRequest) {
                        newMultiSelectAssignArray = serializeMultiSelect(data.multiSelectRequest, 'multiSelectItems');
                        assignmentPayload += '&' + newMultiSelectAssignArray.join('&');
                    }

                    assigneePayload = newAssignedToStringArray.concat(assignToStringArray).join('&');

                    if (programHierarchyData) {
                        assignmentPayload += '&' + programHierarchyData;
                    }

                    if (assigneePayload) {
                        return assignmentPayload + '&' + assigneePayload;
                    }

                    $log.debug('assigneePayload', assigneePayload);
                    $log.debug('assignmentPayload', assignmentPayload);

                    return assignmentPayload;
                },
                userAssignmentTransformReq = function(data) {
                    var newDataListStringArray,
                        getSerializedString = function(userAssignmentData, prefix) {
                            var self = userAssignmentData,
                                userAssignmentDataString = [
                                    prefix + '.userAssignmentId' + '=' + self.userAssignmentId,
                                    prefix + '.score' + '=' + self.score,
                                    prefix + '.scoreSent' + '=' + self.scoreSent
                                ];

                            return userAssignmentDataString.join('&');
                        },
                        serializeUserAssignments = function(userAssignmentDataList, prefix) {
                            var userAssignmentDataStringArray = [];

                            angular.forEach(userAssignmentDataList, function(userAssignmentData, index) {
                                var keyPrefix = encodeURIComponent(prefix + '[' + index + ']');
                                userAssignmentDataStringArray.push(getSerializedString(userAssignmentData, keyPrefix));
                            });
                            return userAssignmentDataStringArray;
                        };

                    if (!angular.isObject(data)) {
                        return data;
                    }

                    newDataListStringArray = serializeUserAssignments(data.userAssignmentDataList,
                        'userAssignmentDataList');
                    newDataListStringArray.push('studentUuid' + '=' + data.studentUuid);

                    return newDataListStringArray.join('&');
                },
                needsRefetch = function(result, requestFilter) {
                    return $currentUser.isTeacher && requestFilter.page > 1 &&
                        result.numberOfAssignments > 0 && result.assignments.length === 0;
                };

            //API

            service.saveAssignment = function(assignmentObj, programHierarchy) {
                var url = restPath + '/v2/assignments';
                var assignmentHierarchyObj = {assignmentObj: assignmentObj, programHierarchyObj: programHierarchy};

                return $http.post(url, assignmentHierarchyObj, {
                    transformRequest: function(data) {
                        return assigneeTransformReq(data.assignmentObj, data.programHierarchyObj);
                    }
                }).then(function(response) {
                    // Update user attribute on success create
                    $currentUser.setAttribute('assignments.created', true);
                    return response.data;
                });
            };

            service.getAssignmentsWithExternalProviderData = function(assignmentData) {
                var iterator = function(assignment) {
                        return isAssignmentDataFromOpenEd(assignment);
                    },
                    openEdIdFn = function(assignment) {
                        return assignment.contentItem ? assignment.contentItem.externalId : undefined;
                    },
                    onResponse = function(assignments, openEdItem) {
                        var openEdAssignment = _.find(assignments, function(assignment) {
                            return !!assignment.contentItem &&
                                assignment.contentItem.externalId === openEdItem.id;
                        });
                        if (openEdAssignment) {
                            openEdItem.originalEquellaItemId = openEdAssignment.contentItem.id;
                            openEdAssignment.contentItem = openEdItem;
                        }
                    };

                return OpenEdItem.retrieveItemsInList(assignmentData.assignments, iterator, openEdIdFn, onResponse)
                    .then(function(assignmentList) {
                        angular.forEach(assignmentList, function(assignment, index) {
                            angular.extend(assignmentList[index], assignment);
                        });
                        return assignmentData;
                    });
            };

            service.getAssignmentsByClass = function(classId, filters) {
                var url = restPath + '/v2/classes/' + classId + '/assignments';
                filters = filters ||
                    ($currentUser.isTeacher ?
                        AssignmentViewOptions.getDefaultFilter(classId) :
                        AssignmentViewOptions.getDefaultStudentFilter());
                return $http({
                    url: url,
                    method: 'GET',
                    params: getIsoFilter(filters)
                })
                    .then(function(response) {
                        if (needsRefetch(response.data, filters)) {
                            filters.page = 1;
                            return service.getAssignmentsByClass(classId, filters);
                        }
                        response.data.page = filters.page;
                        return wrapAssignments(response.data);
                    }, function(err) {
                        $log.error('error getting assignments', err);
                        return $q.reject('error getting assignments', err);
                    });
            };

            service.getAssignmentsByStudent = function(classId) {
                var url = restPath + '/v2/classes/' + classId + '/students/assignments';

                return $http({
                    url: url,
                    method: 'GET'
                })
                    .then(function(response) {
                        _.each(response.data, function(studentSummary, id) {
                            studentSummary.id = id;
                        });

                        return response.data;
                    }, function(err) {
                        $log.error('error getting assignments', err);
                        return $q.reject('error getting assignments', err);
                    });
            };

            service.getActiveCountForUser = function(userId) {
                return $http({
                    url: restPath + '/v2/assignments/' + userId + '/count',
                    method: 'GET'
                }).then(function(response) {
                    return parseInt(response.data, 10);
                }, function(err) {
                    return $q.reject(err);
                });
            };

            service.getStudentAssignmentsCount = function(classId, studentId) {
                var url = restPath + '/v2/classes/' + classId + '/students/' + studentId + '/assignments/count/';

                return $http({
                    url: url,
                    method: 'GET'
                })
                    .then(function(response) {
                        return response.data;
                    }, function(err) {
                        $log.error('error getting assignments', err);
                        return $q.reject('error getting assignments', err);
                    });
            };

            service.getStudentAssignmentsByStatus = function(classId, studentId, status, customFilters) {
                var url = restPath + '/v2/classes/' + classId + '/students/' + studentId +
                    '/assignments/completionStatus/' + status,
                    filters;

                filters = customFilters || AssignmentViewOptions.getDefaultStudentFilter();

                return $http({
                    url: url,
                    method: 'GET',
                    params: getIsoFilter(filters)
                })
                    .then(function(response) {
                        return wrapAssignments(response.data);
                    }, function(err) {
                        $log.error('error getting assignments', err);
                        return $q.reject('error getting assignments', err);
                    });
            };

            service.getAssignmentsCountByClass = function(classId) {
                var url = restPath + '/v2/classes/' + classId + '/assignmentsCount';

                return $http.get(url)
                    .then(function(response) {
                        return response.data;
                    }, function(err) {
                        return $q.reject('error getting assignments count', err);
                    });
            };

            function getAssignment(AssignmentCreateFn, classId, assignmentId) {
                var url = restPath + '/v2/classes/' + classId + '/assignments/' + assignmentId;

                return $http({url: url, method: 'GET'})
                    .then(function(response) {
                        var assignment = response.data;
                        var deferred = $q.defer();
                        var itemPromises = [];
                        if (assignment.contentItem.fileType === 'Sequence') {
                            angular.forEach(assignment.contentItem.contentItems, function(lessonItem) {
                                if (lessonItem.mediaType === 'Learning Model' && lessonItem.contentItems.length) {
                                    var itemListpromise = OpenEdItem.retrieveItemsInList(
                                        lessonItem.contentItems, function(item) {
                                        return item.externalSource === ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED;
                                    });
                                    itemPromises.push(itemListpromise);
                                }
                            });
                            var itemPromise = OpenEdItem.retrieveItemsInList(
                                assignment.contentItem.contentItems, function(item) {
                                return item.externalSource === ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED;
                            });
                            itemPromises.push(itemPromise);
                            $q.all(itemPromises).then(function() {
                                deferred.resolve(new AssignmentCreateFn(assignment));
                            });
                            return deferred.promise;
                        } else if (assignment.contentItem.externalSource ===
                            ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED) {
                            return OpenEdItem.getPromise(assignment.contentItem.externalId).then(function(item) {
                                var originalEquellaItemId = response.data.contentItem.id;
                                assignment.contentItem = item;
                                response.data.contentItem.originalEquellaItemId = originalEquellaItemId;
                                return new AssignmentCreateFn(assignment);
                            });
                        } else {
                            return new AssignmentCreateFn(assignment);
                        }
                    }, function(err) {
                        $log.error('Error getting assignment', err);

                        //reject will bubble up and redirect to error page unless caught.
                        return $q.reject(getRejectObject(err));
                    });
            }
            /**
             * @deprecated please use getLWCAssignment(...)
             */
            // Get single assignment
            service.get = function(classId, assignmentId) {
                var createRealizeAssignmentFn = function(assignment) {
                    return new Assignment(assignment);
                };
                return getAssignment(createRealizeAssignmentFn, classId, assignmentId);
            };

            // Get generic lwcassignment
            service.getLWCAssignment = function(classId, assignmentId) {
                var createLWCAssignmentFn = function(assignment) {
                    return new lwcAssignment(assignment);
                };
                return getAssignment(createLWCAssignmentFn, classId, assignmentId);
            };

            service.preview = function(previewPath) {
                $currentUser.previewItemsStatusList = {};
                $currentUser.isPreviewingAssignment = true;
                $location.path(previewPath);
            };

            service.previewItem = function(assignmentItem) {
                var key = [assignmentItem.id, assignmentItem.version].join(' ');
                $currentUser.previewItemsStatusList[key] = assignmentItem.selectedLanguage;
                $log.debug('previewItemsStatusList', $currentUser.previewItemsStatusList);
            };

            service.updateLanguagePreference = function(userAssignmentId, languageItemUuid) {
                var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId +
                    '/language/' + languageItemUuid;

                return $http.put(url).then(function(response) {
                    return response.data;
                });
            };

            service.setInProgress = function(userAssignmentId, isAdaptive, classId, assignmentId) {
                var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId + '/status',
                    params = {status: 'IN_PROGRESS'};

                if (isAdaptive) {
                    params.isAdaptive = isAdaptive;
                    params.classUuid = classId;
                    params.assignmentId = assignmentId;
                }

                return $http({
                    url: url,
                    method: 'PUT',
                    params: params
                }).then(function(response) {
                    return response.data;
                });
            };

            service.setCompleted = function(userAssignmentId, isAdaptive, itemType, deeplink) {
                var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId + '/status',
                    params = {status: 'COMPLETED'};
                if (isAdaptive) {
                    params.isAdaptive = isAdaptive;
                }
                if (itemType) {
                    params.itemType = itemType;
                }
                if (deeplink) {
                    params.deeplink = deeplink;
                }
                return $http({
                    url: url,
                    method: 'PUT',
                    params: params
                }).then(function(response) {
                    return response.data;
                });
            };

            service.getAllAssignedTos = function(assignmentId) {
                var url = restPath + '/v2/assignments/' + assignmentId + '/assignedTos';

                return $http.get(url)
                    .then(function(response) {
                        return response.data;
                    }, function(err) {
                        return $q.reject('error getting all assignees', err);
                    });
            };

            service.getClassesReportingData = function(teacherStat) {
                return ClassDataService.getClassesReportingData(teacherStat);
            };

            service.dismissPastDueWarning = function(assignmentId) {
                pastDueAssignmentWarningsDismissed.push(assignmentId);
            };

            service.isPastDueWarningDismissed = function(assignmentId) {
                return _.contains(pastDueAssignmentWarningsDismissed, assignmentId);
            };

            service.saveManuallyEnteredScore = function(userAssignment) {
                var url = restPath + '/v2/assignments/userAssignment/manualScore';

                return $http.post(url, userAssignment, {
                    transformRequest: function(d) {
                        return userAssignmentTransformReq(d);
                    }
                }).then(function(response) {
                    return response.data;
                }, function(error) {
                    return $q.reject('error while saving manual score', error);
                });
            };

            //Check if the userAssignment metadata have score
            service.hasScore = function(metadata) {
                return !!(metadata && metadata.userAssignmentDataList &&
                    metadata.userAssignmentDataList.length > 0 &&
                    (metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' ||
                        metadata.userAssignmentDataList[0].scoreSource === 'MANUAL') &&
                    angular.isNumber(metadata.userAssignmentDataList[0].score));
            };

            service.hasScoreSourceManual = function(metadata) {
                return !!(metadata && metadata.userAssignmentDataList &&
                    metadata.userAssignmentDataList.length > 0 &&
                    metadata.userAssignmentDataList[0].scoreSource === 'MANUAL');
            };

            //TODO MOVE(REMOVE) THIS
            // Get score from userAssignment metadata, first one is latest attempt
            service.getScore = function(metadata) {
                if (!metadataHasScore(metadata)) {
                    return;
                }
                return metadata.userAssignmentDataList[0].score;
            };

            service.getEssayScore = function(metadata, maxScore) {
                if (!metadataHasScore(metadata)) {
                    return;
                }
                var scoreData = metadata.userAssignmentDataList[0];
                return (scoreData.correctAnswers / scoreData.totalQuestions) * maxScore;
            };

            service.isManualScoreType = function(metadata) {
                return metadata && metadata.itemType === 'TEST' && //safety check
                    metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                    metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                    metadata.userAssignmentDataList[0].manualScore;
            };

            service.isNotScored = function(metadata) {
                return metadata && metadata.itemType === 'TEST' && //safety check
                    metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                    metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                    metadata.userAssignmentDataList[0].needsManualScoring;
            };

            service.isScoreSent = function(metadata) {
                return metadata && metadata.itemType === 'TEST' && //safety check
                    metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                    metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                    metadata.userAssignmentDataList[0].scoreSent; //completed test with no manual score is true
            };

            service.scoredAndSent = function(metadata) { //convenience method
                return !service.isNotScored(metadata) && service.isScoreSent(metadata);
            };

            service.computeScoreStatus = function(metadata) {
                return {
                    isManualScore: service.isManualScoreType(metadata),
                    isNotScored: service.isNotScored(metadata),
                    isScoreSent: service.isScoreSent(metadata),
                    score: service.getScore(metadata)
                };
            };

            service.getScoreStatusCounts = function(studentMetadataList) {
                var countObj = {},
                    notScored,
                    total,
                    sent;

                countObj.studentCount = studentMetadataList.length;
                countObj.scoreCount = _.countBy(studentMetadataList, function(student) {
                    return student.isNotScored ? 'notScored' : 'scored';
                });

                countObj.sendCount = _.countBy(studentMetadataList, function(student) {
                    return student.isScoreSent ? 'sent' : 'notSent';
                });

                notScored = countObj.scoreCount.notScored;
                total = countObj.studentCount;
                sent = countObj.sendCount.sent;

                countObj.isPartiallyScored = (notScored > 0) && (notScored < total);
                countObj.isPartiallySent = (sent > 0) && (sent < total);

                countObj.allScoresSent = countObj.sendCount.sent === total;
                countObj.allUnscored = countObj.scoreCount.notScored === total;

                $log.log('scoringReviewStatus: ', countObj);
                return countObj;
            };

            service.getUploadAttachmentUrl = function(userAssignmentId) {
                return restPath + '/v2/assignments/userAssignment/' + userAssignmentId + '/attachments';
            };

            service.attachLink = function(assignmentId, userAssignmentId, attachmentLink, title) {
                var url = service.getUploadAttachmentUrl(userAssignmentId);
                return $http({
                    url: url,
                    method: 'POST',
                    params: {
                        assignmentId: assignmentId,
                        url: attachmentLink,
                        title: title
                    }
                }).then(function(response) {
                    return JSON.parse(response.data);
                });
            };

            service.removeAttachment = function(assignment) {
                var userAssignmentId = assignment.$getPrimaryMetadata().userAssignmentId;

                return updateAttachmentStatus(userAssignmentId, ASSIGNMENT_CONSTANTS.ATTACHMENT_STATUS.DELETED)
                    .then(function() {
                        var removedAttachment = assignment.$getUserAttachment();
                        assignment.$getPrimaryMetadata().attachmentUrl = null;
                        return removedAttachment;
                    });
            };

            service.reattachAttachment = function(assignment, removedAttachment) {
                var userAssignmentId = assignment.$getPrimaryMetadata().userAssignmentId;

                return updateAttachmentStatus(userAssignmentId, ASSIGNMENT_CONSTANTS.ATTACHMENT_STATUS.LIVE)
                    .then(function() {
                        assignment.$getPrimaryMetadata().attachmentUrl = removedAttachment.path;
                    });
            };

            service.hideAssignment = function(assignment, classId, isGoogleClass, userId) {
                return hideUnhide(assignment.assignmentId, classId, 'INACTIVE', isGoogleClass).then(function() {
                    assignment.status = 'INACTIVE';
                    var storedDefaultPreference = webStorage.get(standardMasteryByClass +
                        '.' + userId + '.' + classId);
                    if (storedDefaultPreference && storedDefaultPreference.assignmentIds &&
                        storedDefaultPreference.assignmentIds.includes(assignment.assignmentId)) {
                        service.resetlocalStorageData(storedDefaultPreference, userId, classId);
                    }
                }, function(err) {
                    $log.error('Failed to hide assignment', err);
                });
            };

            service.unhideAssignment = function(assignment, classId, isGoogleClass) {
                return hideUnhide(assignment.assignmentId, classId, 'AVAILABLE',
                    isGoogleClass).then(function() {
                    assignment.status = 'AVAILABLE';
                }, function(err) {
                    $log.error('Failed to unhide assignment', err);
                });
            };

            service.bulkShowHide = function(classId, assignmentList, status, isGoogleClass) {
                var url = restPath + '/v2/classes/' + classId + '/assignments/status';
                return $http({
                    url: url,
                    method: 'PUT',
                    params: {
                        assignmentIds: assignmentList,
                        status: status,
                        isGoogleImportedClass: isGoogleClass
                    }
                });
            };

            service.publishScores = function(assignmentId, classId) {
                var url = restPath + '/v2/classes/' + classId + '/assignments/' + assignmentId + '/scores';

                return $http({url: url, method: 'POST'}).then(function(response) {
                    $log.log('Published assignment scores', response);
                    return response.data;
                }, function(error) {
                    $log.error('Failed to publish assignment scores', error);
                    return $q.reject(error);
                });
            };

            service.deleteUserAssignment = function(userAssignmentId) {
                var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId;

                return $http.delete(url).then(function(response) {
                    return response.data;
                }, function(err) {
                    return $q.reject('Error deleting userAssignment', err);
                });
            };

            service.restoreUserAssignment = function(userAssignmentId) {
                var url = restPath + '/v2/assignments/userAssignment/' + userAssignmentId + '/undelete';

                return $http.post(url).then(function(response) {
                    return response.data;
                }, function(err) {
                    return $q.reject('Error undo deleting userAssignment', err);
                });
            };

            service.resetlocalStorageData = function(storedDefaultPreference, userId, classId) {
                if (storedDefaultPreference.standards) {
                    storedDefaultPreference.standards = lwcI18nFilter('masteryByStandard.filter.allStandards');
                    storedDefaultPreference.isAllStandards = true;
                }
                if (storedDefaultPreference.contentCategory) {
                    storedDefaultPreference.contentCategory = lwcI18nFilter('masteryByStandard.filter.allCategories');
                    storedDefaultPreference.isAllContentCategory = true;
                }
                if (storedDefaultPreference.assignmentId) {
                    storedDefaultPreference.assignmentId = lwcI18nFilter('masteryByStandard.filter.allAssignments');
                    storedDefaultPreference.isAllAssignment = true;
                }
                if (storedDefaultPreference.assignmentTitle) {
                    storedDefaultPreference.assignmentTitle = lwcI18nFilter('masteryByStandard.filter.allAssignments');
                }
                storedDefaultPreference.assignmentIds = [];
                webStorage.add(standardMasteryByClass +
                    '.' + userId + '.' + classId, storedDefaultPreference);
            };

            return service;
        }
    ]);
