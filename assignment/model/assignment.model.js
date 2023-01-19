angular.module('Realize.assignment.model.assignment', [
    'Realize.assignment.utilService',
    'Realize.assignment.constants',
    'Realize.user.currentUser',
    'rlzComponents.components.i18n',
    'Realize.content.constants',
    'Realize.content.model.contentItem',
    'Realize.constants.mediaType'
])
    .factory('Assignment', [
        '$log',
        'Content',
        '$filter',
        'ASSIGNMENT_CONSTANTS',
        '$currentUser',
        '$q',
        'AssignmentUtil',
        'CONTENT_CONSTANTS',
        'MEDIA_TYPE',
        function($log, Content, $filter, ASSIGNMENT_CONSTANTS, $currentUser, $q, AssignmentUtil, CONTENT_CONSTANTS,
            MEDIA_TYPE) {
            'use strict';

            var Assignment,
                lwcI18nFilter = $filter('lwcI18n'),
                numberFilter = $filter('number'),
                metadataHasScore = function(metadata) {
                    return metadata && metadata.userAssignmentDataList && metadata.userAssignmentDataList.length > 0;
                },
                countStudentsFromMetadata = function(studentMetadata) {
                    var groupByStudentId = _.groupBy(studentMetadata, function(metadata) {
                        return metadata.studentUuid;
                    });
                    return _.size(groupByStudentId);
                },
                legibleDateFormat = ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YY_TIME;

            Assignment = function(json) {
                var self = this;

                angular.copy(json || {}, self);

                if (self.contentItem) {
                    self.contentItem = new Content(_.clone(self.contentItem));
                } else {
                    $log.error('Missing contentItem!');
                    self.missingContentItem = true;
                    self.contentItem = new Content();
                }

                if (self.startDate) {
                    self.parsedStart = moment(self.startDate);
                    self.startDateLegible = self.parsedStart.format(legibleDateFormat);
                }

                if (self.dueDate) {
                    self.parsedEnd = moment(self.dueDate);
                    self.dueDateLegible = self.parsedEnd.format(legibleDateFormat);
                }

                if (self.remediationDueDate) {
                    self.parsedRemediationEnd = moment(self.remediationDueDate);
                    self.remediationDueDateLegible = self.parsedRemediationEnd.format(legibleDateFormat);
                } else if (self.allowRemediation && !self.remediationDueDate) {
                    self.parsedRemediationEnd = Assignment.getDefaultRemediationDate(self.dueDate);
                }

                if (angular.isDefined(self.averageScore)) {
                    self.roundedClassAverage = numberFilter(self.averageScore, 0);
                }

                // Build list for the assignType(#) display
                self.classUuids = [];
                self.groupUuids = [];
                self.studentUuids = [];
                angular.forEach(self.assignedTo, function(at) {
                    if (at.classUuid && !_.contains(self.classUuids, at.classUuid) &&
                        !at.groupUuid && !at.studentUuid) {
                        self.classUuids.push(at.classUuid);
                    } else if (at.groupUuid && !_.contains(self.groupUuids, at.groupUuid)) {
                        self.groupUuids.push(at.groupUuid);
                    } else if (at.studentUuid && !_.contains(self.studentUuids, at.studentUuid)) {
                        self.studentUuids.push(at.studentUuid);
                    }
                });

                // Student completion status
                if (self.studentMetadata) {
                    var isLesson = self.$isLesson(),
                        isRRS = self.isRRS(),
                        incrementCount = function(metadata) {
                            var isChildAssignment = self.assignmentId !== metadata.assignmentId;
                            return (!isLesson && !isRRS) ||
                                (isLesson && metadata.itemType === 'Sequence' && !isChildAssignment) ||
                                (isRRS && metadata.itemType === 'Realize Reader Selection' && !isChildAssignment);
                        };

                    self.studentsCompleted = 0;
                    self.studentsInProgress = 0;
                    self.studentsNotStarted = 0;
                    angular.forEach(self.studentMetadata, function(studentAssignment) {
                        if (studentAssignment.userAssignmentStatus &&
                            studentAssignment.userAssignmentStatus.toLowerCase() ===
                            ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED) {
                            studentAssignment.status = ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED;
                            if (incrementCount(studentAssignment)) {
                                self.studentsCompleted ++;
                            }
                        } else if (studentAssignment.markCompleted) {
                            studentAssignment.status = ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
                            if (incrementCount(studentAssignment)) {
                                self.studentsCompleted ++;
                            }
                        // Business Rule: if attachment is uploaded, it is in progress
                        } else if (studentAssignment.lastOpenDate || studentAssignment.attachmentUrl) {
                            studentAssignment.status = ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS;
                            if (incrementCount(studentAssignment)) {
                                self.studentsInProgress++;
                            }
                        } else {
                            studentAssignment.status = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;
                            if (incrementCount(studentAssignment)) {
                                self.studentsNotStarted++;
                            }
                        }
                    });
                }

                if (self.studentMetadata) {
                    //updated the code to pick lesson sequence or RRS item alone.
                    if (self.$isLesson()) {
                        self.studentsTotal = _.where(self.studentMetadata, {
                            itemType: 'Sequence',
                            assignmentId: self.assignmentId
                        }).length;
                    } else if (self.isRRS()) {
                        self.studentsTotal = _.where(self.studentMetadata, {
                            itemType: 'Realize Reader Selection',
                            assignmentId: self.assignmentId
                        }).length;
                    } else {
                        self.studentsTotal = self.studentMetadata.length;
                    }

                    var metadataWithScore = self.$getMetadataWithScore(),
                        metadataWithFilteredRRSSCOScore = self.getMetadataWithFilteredRRSSCOScore();

                    //score-related flags
                    self.hasManualScore = self.$requireManualScoreCount() > 0;
                    self.hasNotSentScore = self.$notSentScoreCount() > 0;
                    self.hasNotScored = self.$notScoredCount() > 0;
                    self.allNotScored = self.$notScoredCount() > 0 &&
                        self.$notScoredCount() === self.$requireManualScoreCount();
                    self.hasScoredMetadata = metadataWithScore.length > 0;
                    self.hasScoredMetadataWithFilteredRRSSCO = metadataWithFilteredRRSSCOScore.length > 0;
                    self.completedScorableTest = !self.hasNotScored && !self.hasNotSentScore;
                    self.hasNotSentManualScore = self.hasManualScore && self.hasNotSentScore;
                    self.hasNotScoredManualScore = self.hasManualScore && self.hasNotScored;
                    self.hasOnlyNotScored = self.hasNotScored && !self.hasNotSentScore;
                }
            };

            Assignment.getDefaultRemediationDate = function(date) {
                return moment(date).add(ASSIGNMENT_CONSTANTS.DEFAULT_REMEDIATION_DAYS, ASSIGNMENT_CONSTANTS.TIMES.DAYS);
            };

            Assignment.getDefaultRemediationDateString = function(date) {
                return Assignment.getDefaultRemediationDate(date).format(ASSIGNMENT_CONSTANTS.DATE_FORMAT.MM_DD_YYYY);
            };

            Assignment.prototype.$getTitle = function() {
                var prefix = '';

                if (this.type === ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.REMEDIATION) {
                    prefix = lwcI18nFilter('global.assignment.remediationPrefix') + ' ';
                } else if (this.type === ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.ENRICHMENT) {
                    prefix = lwcI18nFilter('global.assignment.enrichmentPrefix') + ' ';
                }

                return prefix + this.title;
            };

            Assignment.prototype.$save = function() {
                throw new Error('You should use AssignmentFacadeService.saveAssignment');
            };

            Assignment.prototype.$getUploadAttachmentUrl = function() {
                throw new Error('You should use AssignmentFacadeService.getUploadAttachmentUrl');
            };

            Assignment.prototype.$getAttachmentUrl = function() {
                var metadata = this.$getPrimaryMetadata();
                if (angular.isDefined(metadata)) {
                    return metadata.attachmentUrl;
                } else {
                    return null;
                }
            };

            Assignment.prototype.$getAttachmentTitle = function() {
                var metadata = this.$getPrimaryMetadata();
                if (angular.isDefined(metadata)) {
                    return metadata.attachmentTitle || '';
                } else {
                    return null;
                }
            };

            // newUrl so we can get an attachment obj without refreshing the page
            Assignment.prototype.$getUserAttachment = function(newUrl) {
                var attachmentUrl = newUrl || this.$getAttachmentUrl(),
                    attachmentTitle = this.$getAttachmentTitle();
                // EX: '/community/proxy/equella/items/4fafd38d-9ebc-46a8-93d5-eb633cc4b20c/1/ngan.reali.35273.jpg';
                if (attachmentUrl) {
                    var split = attachmentUrl.split('/');
                    return {
                        filename: attachmentTitle || split[split.length - 1],
                        path: attachmentUrl,
                        uuid: split[split.length - 3],
                        downloadLink: attachmentUrl.replace('equella/items', 'equella/force-download/items')
                    };
                } else {
                    return null;
                }
            };

            Assignment.prototype.$hasAttachment = function() {
                var attachment = this.$getUserAttachment();
                return !!(attachment && !!attachment.filename);
            };

            Assignment.prototype.$removeAttachment = function() {
                throw new Error('You should use AssignmentFacadeService.removeAttachment');
            };

            Assignment.prototype.$reattachAttachment = function() {
                throw new Error('You should use AssignmentFacadeService.reattachAttachment');
            };

            //Returns date obj for start date and due date
            Assignment.prototype.$getLegibleDateObj = function() {
                return {
                    startDate: this.parsedStart.clone(),
                    dueDate: this.parsedEnd.clone(),
                    remediationDueDate: this.parsedRemediationEnd ? this.parsedRemediationEnd.clone() : 0
                };
            };

            // Find the studentMetadata object that contains the given assignmentItem id (&& studentId if given)
            Assignment.prototype.$findItemMetadata = function(assignmentItemId, studentId) {
                var self = this;
                return _.find(self.studentMetadata, function(metadata) {
                    if (studentId) {
                        return metadata.studentUuid === studentId &&
                            _.find(metadata.userAssignmentLanguageList, function(multiLang) {
                                return multiLang.itemUuid === assignmentItemId;
                            }) !== undefined;

                    } else {
                        return _.find(metadata.userAssignmentLanguageList, function(multiLang) {
                            return multiLang.itemUuid === assignmentItemId;
                        }) !== undefined;
                    }
                });
            };

            Assignment.prototype.$getItemStatus = function(itemId, studentId) {
                var assignment = this,
                    meta = assignment.$findItemMetadata(itemId, studentId);

                if (!meta || meta.itemType === 'TXT' || !meta.status) {
                    return ASSIGNMENT_CONSTANTS.STATUS.UNKNOWN;
                } else {
                    return meta.status;
                }
            };

            Assignment.prototype.$isScoOrTest = function() {
                return this.contentItem &&
                    (this.contentItem.fileType === 'SCO' ||
                     this.contentItem.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO ||
                     this.contentItem.fileType === 'TEST');
            };

            Assignment.prototype.$isLesson = function() {
                return this.contentItem && this.contentItem.mediaType === 'Lesson';
            };

            Assignment.prototype.isRRS = function() {
                return this.contentItem.isRRS();
            };

            Assignment.prototype.isSingleDiscussion = function() {
                return this.contentItem && this.contentItem.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT;
            };

            Assignment.prototype.isSingleDiscussionPastDueDate = function() {
                var pastDueDate = moment().isAfter(this.$getLegibleDateObj().dueDate);

                return (!this.dueDate) ? false : this.isSingleDiscussion() && pastDueDate;
            };

            Assignment.prototype.isLessonWithDisucssionAssignment = function() {
                return this.$isLesson() && this.contentItem && this.contentItem.contentItems &&
                    _.find(this.contentItem.contentItems, function(item) {
                        return item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT;
                    });
            };

            Assignment.prototype.isAssignmentPastDueDate = function() {
                return moment().isAfter(this.$getLegibleDateObj().dueDate);
            };

            Assignment.prototype.$isLessonWithoutScorableItems = function() {
                if (this.$isLesson()) {
                    return !this.$hasScorableItems();
                } else {
                    return false;
                }
            };

            // the metadata that represents the item that the teacher clicked Assign on
            Assignment.prototype.$getPrimaryMetadata = function(studentId) {
                return this.$findItemMetadata(this.itemUuid, studentId);
            };

            Assignment.prototype.$getChildAdaptiveUserAssignment = function() {
                var self = this;
                var filteredMetadata = self.studentMetadata;
                var childAdaptiveMetadata = null;
                if (self.$isLesson()) {
                    childAdaptiveMetadata = _.filter(filteredMetadata, function(metadata) {
                        return metadata.assignmentId !== self.assignmentId;
                    });
                }
                return childAdaptiveMetadata ? childAdaptiveMetadata[0] : null;
            };

            Assignment.prototype.$isSingleItemAssignment = function() {
                return this.contentItem.fileType !== 'Sequence';
            };

            Assignment.prototype.isAdaptiveAssignment = function() {
                return this.type === 'ADAPTIVE' || this.contentItem.mediaType === 'Adaptive Homework';
            };

            Assignment.prototype.isMultiStageAssignment = function() {
                return this.type.toUpperCase() === ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.MULTISTAGE;
            };

            Assignment.prototype.$getAssignmentStatus = function(studentId) {
                if ($currentUser.isPreviewingAssignment) {
                    return ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;
                } else {
                    var primary = this.$getPrimaryMetadata(studentId);
                    // Business Rule: if attachment is uploaded, it is in progress
                    if (primary.attachmentUrl && primary.status === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED) {
                        return ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS;
                    }
                    return primary.status;
                }
            };

            Assignment.prototype.$hasScorableItems = function() {
                var self = this;
                return _.find(self.studentMetadata, function(metadata) {
                    return (metadata.itemType === 'TEST' || metadata.itemType === 'SCO' ||
                    metadata.itemType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO);
                }) !== undefined;
            };

            //TODO Refactor to userAssignment.model.js
            var isManualScoreType = function(metadata) {
                    return metadata && metadata.itemType === 'TEST' && //safety check
                        metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                        metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                        metadata.userAssignmentDataList[0].manualScore;
                },
                isNotScored = function(metadata) {
                    return metadata && metadata.itemType === 'TEST' && //safety check
                        metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                        metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                        metadata.userAssignmentDataList[0].needsManualScoring;
                },
                isScoreSent = function(metadata) {
                    return metadata && metadata.itemType === 'TEST' && //safety check
                        metadataHasScore(metadata) && metadata.userAssignmentDataList[0] &&
                        metadata.userAssignmentDataList[0].completionStatus === 'COMPLETED' &&
                        metadata.userAssignmentDataList[0].scoreSent; //completed test with no manual score is true
                },
                getScore = function(metadata) {
                    if (!metadataHasScore(metadata)) {
                        return;
                    }
                    return metadata.userAssignmentDataList[0].score;
                },
                computeScoreStatus = function(metadata) {
                    return {
                        isManualScore: isManualScoreType(metadata),
                        isNotScored: isNotScored(metadata),
                        isScoreSent: isScoreSent(metadata),
                        score: getScore(metadata)
                    };
                };

            // get a student's score on a particular item in the assignment
            Assignment.prototype.$getItemScoreForStudent = function(itemId, studentId) {
                var meta = this.$findItemMetadata(itemId, studentId);
                return getScore(meta);
            };

            Assignment.prototype.$requireManualScoreCount = function() {
                var self = this,
                    filteredMetadata = self.studentMetadata,
                    manualScoreMetadata;

                if (self.$isLesson()) {
                    filteredMetadata = self.$getCompleteLessonMetadata();
                }

                manualScoreMetadata = _.filter(filteredMetadata, function(metadata) {
                    return metadataHasScore(metadata) && isManualScoreType(metadata);
                });
                return countStudentsFromMetadata(manualScoreMetadata);
            };

            Assignment.prototype.$notScoredCount = function() {
                var self = this,
                    filteredMetadata = self.studentMetadata,
                    completedTestNeedScoring;

                if (self.$isLesson()) {
                    filteredMetadata = self.$getCompleteLessonMetadata();
                }

                completedTestNeedScoring = _.filter(filteredMetadata, function(metadata) {
                    return metadataHasScore(metadata) && isNotScored(metadata);
                });
                return countStudentsFromMetadata(completedTestNeedScoring);
            };

            Assignment.prototype.$notSentScoreCount = function() {
                var self = this,
                    filteredMetadata = self.studentMetadata,
                    scoredTestNotSent;

                if (self.$isLesson()) {
                    filteredMetadata = self.$getCompleteLessonMetadata();
                }

                scoredTestNotSent = _.filter(filteredMetadata, function(metadata) {
                    return metadataHasScore(metadata) && metadata.itemType === 'TEST' &&
                        !isScoreSent(metadata) && !isNotScored(metadata);
                });
                return countStudentsFromMetadata(scoredTestNotSent);
            };

            Assignment.prototype.$isRemediationAssignment = function() {
                return angular.isString(this.remediationOriginalItemUuid);
            };

            Assignment.prototype.$isNotStarted = function() {
                return this.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;
            };

            Assignment.prototype.$isCompleted = function() {
                return this.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
            };

            Assignment.prototype.$isInProgress = function() {
                return this.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS;
            };

            Assignment.prototype.$isPastDue = function(dateOnly) {
                var today = moment(),
                    pastDueDate = today.isAfter(this.$getLegibleDateObj().dueDate);

                if (!this.dueDate) { //REMEDIATION OR ENRICHMENT have no due date
                    return false;
                } else if (dateOnly) { // Used in the case where we know the status already
                    return pastDueDate;
                } else {
                    return !this.$isCompleted() && pastDueDate;
                }
            };

            Assignment.prototype.$isLate = function(student) {
                if (!this.dueDate) { //REMEDIATION OR ENRICHMENT have no due date
                    return false;
                }
                var self = this,
                    lastOpenDate,
                    dueDate = self.$getLegibleDateObj().dueDate;

                if (student) { // Finding if this particular student is late
                    lastOpenDate = moment(student.lastOpenDate);
                    return student.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED &&
                       lastOpenDate.isAfter(dueDate);
                } else {
                    lastOpenDate = moment(self.$getPrimaryMetadata().lastOpenDate);
                    return self.$isCompleted() && lastOpenDate.isAfter(dueDate);
                }
            };

            Assignment.prototype.$hide = function() {
                throw new Error('You should use AssignmentFacadeService.hideAssignment');
            };

            Assignment.prototype.$unhide = function() {
                throw new Error('You should use AssignmentFacadeService.unhideAssignment');
            };

            Assignment.prototype.$getLessonItems = function() {
                return this.contentItem.$getLessonItems();
            };

            Assignment.prototype.getRRSActivities = function(isStudentLogin) {
                var self = this,
                    RRSActivityPromises = [],
                    singleRRSPromise = function(contentItem) {
                        return contentItem.getRRSActivities()
                            .then(function(response) {
                                contentItem.RRSActivities = response;
                            });
                    },
                    prepareRRSPromises = function(contentItems) {
                        angular.forEach(contentItems, function(contentItem) {
                            if (contentItem.isRRS()) {
                                RRSActivityPromises.push(singleRRSPromise(contentItem));
                            }
                        });
                    };

                if (self.isRRS()) {
                    RRSActivityPromises.push(singleRRSPromise(self.contentItem));
                } else if (self.$isLesson()) {
                    if (isStudentLogin) {
                        angular.forEach(self.contentItem.contentItems, function(contentItem) {
                            if (contentItem.isRRS()) {
                                RRSActivityPromises.push(singleRRSPromise(contentItem));
                            } else if (contentItem.mediaType === MEDIA_TYPE.LEARNING_MODEL) {
                                prepareRRSPromises(contentItem.contentItems);
                            }
                        });
                    } else {
                        var contentItems = (self.childContents) ? self.childContents : self.$getLessonItems();
                        prepareRRSPromises(contentItems);
                    }
                }

                return RRSActivityPromises;
            };

            Assignment.prototype.$getCompletedStudentMetadata = function() {
                var self = this,
                    completedStudents = _.where(self.studentMetadata, {status: 'completed'});
                return completedStudents;
            };

            Assignment.prototype.getInProgressOrCompleteStudentMetadata = function() {
                var self = this;
                var completedStudents = _.filter(self.studentMetadata, function(metadata) {
                    return metadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED ||
                        metadata.status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS;
                });
                return completedStudents;
            };

            Assignment.prototype.$getCompleteLessonMetadata = function() {
                var self = this,
                    completedStudentIds = self.$getStudentWithCompletedLesson();
                return _.filter(self.studentMetadata, function(metadata) {
                    return _.contains(completedStudentIds, metadata.studentUuid);
                });
            };

            Assignment.prototype.$getStudentWithCompletedLesson = function() {
                var self = this,
                    completedLessons, completedStudentIds;

                if (self.$isLesson()) {
                    completedLessons = _.filter(self.studentMetadata, function(metadata) {
                        return metadata.itemType === 'Sequence' &&
                            metadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
                    });
                    completedStudentIds = _.pluck(completedLessons, 'studentUuid');
                    return completedStudentIds;
                } else {
                    $log.warn('Not lesson assignment!', self);
                    return [];
                }
            };

            Assignment.prototype.getStudentWithInProgressOrCompletedLesson = function() {
                var self = this;
                var inProgressOrCompletedLessons;
                var inProgressOrCompletedStudentIds;

                if (self.$isLesson()) {
                    inProgressOrCompletedLessons = _.filter(self.studentMetadata, function(metadata) {
                        return metadata.itemType === 'Sequence' &&
                            (metadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED ||
                                metadata.status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS);
                    });
                    inProgressOrCompletedStudentIds = _.pluck(inProgressOrCompletedLessons, 'studentUuid');
                    return inProgressOrCompletedStudentIds;
                } else {
                    $log.warn('Not lesson assignment!', self);
                    return [];
                }
            };

            // Returns {contentId: [studentMetadata]}
            Assignment.prototype.$getCompletedManualTestMetadataFromLesson = function() {
                var self = this,
                    completedStudentIds = self.$getStudentWithCompletedLesson(),
                    completedStudentsByContent = _.chain(self.studentMetadata)
                        .filter(function(metadata) { //Only wants completed student's TEST with manualScore
                            return _.contains(completedStudentIds, metadata.studentUuid) &&
                                isManualScoreType(metadata);
                        })
                        .map(function(metadata) { //Add score status
                            angular.extend(metadata, computeScoreStatus(metadata));
                            return metadata;
                        })
                        .groupBy(function(metadata) { //Group by content
                            var selectedLanguageData = _.findWhere(metadata.userAssignmentLanguageList, {
                                isSelected: true
                            });
                            return selectedLanguageData.itemUuid;
                        })
                        .value();
                return completedStudentsByContent;
            };

            // Returns {contentId: [studentMetadata]}
            Assignment.prototype.getInProgressOrCompletedManualTestMetadataFromLesson = function() {
                var self = this;
                var inProgressOrCompletedStudentIds = self.getStudentWithInProgressOrCompletedLesson();
                var inProgressOrCompletedStudentsByContent = _.chain(self.studentMetadata)
                    .filter(function(metadata) {
                        return _.contains(inProgressOrCompletedStudentIds, metadata.studentUuid) &&
                            isManualScoreType(metadata);
                    })
                    .map(function(metadata) {
                        angular.extend(metadata, computeScoreStatus(metadata));
                        return metadata;
                    })
                    .groupBy(function(metadata) {
                        var selectedLanguageData = _.findWhere(metadata.userAssignmentLanguageList, {
                            isSelected: true
                        });
                        return selectedLanguageData.itemUuid;
                    })
                    .value();
                return inProgressOrCompletedStudentsByContent;
            };

            //both manual/auto
            Assignment.prototype.$getMetadataWithScore = function() {
                var self = this;
                return _.filter(self.studentMetadata, function(metadata) {
                    return metadataHasScore(metadata);
                });
            };

            Assignment.prototype.getMetadataWithFilteredRRSSCOScore = function() {
                var self = this;
                return _.filter(self.studentMetadata, function(metadata) {
                    return metadata.itemType !== CONTENT_CONSTANTS.ITEM_TYPE.RRSSCO && metadataHasScore(metadata);
                });
            };

            Assignment.prototype.$isMetaDataForAdaptiveItem = function(metadata) {
                var self = this, contentId, content;
                if (!angular.isArray(metadata.userAssignmentLanguageList)) {
                    return false;
                }
                contentId = metadata.userAssignmentLanguageList[0].itemUuid;
                content = self.$getLessonItemsCompletedByStudent(contentId);
                return content.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK;
            };

            Assignment.prototype.$getLessonItemsCompletedByStudent = function(completedContentIds) {
                var self = this,
                    matchedItems = [],
                    lessonItems = self.$getLessonItems();

                angular.forEach(completedContentIds, function(contentId) {
                    var content = _.findWhere(lessonItems, {id: contentId});
                    if (content) {
                        matchedItems.push(content);
                    } else {
                        $log.error('Content item referenced by metadata is missing', contentId);
                    }
                });

                return matchedItems;
            };

            Assignment.prototype.$getCompletedManualScoreTestsByStudentId = function(studentId) {
                var self = this,
                    completedManualScoreTest = _.filter(self.studentMetadata, function(metadata) {
                        return metadata.studentUuid === studentId &&
                            metadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED &&
                            isManualScoreType(metadata);
                    });
                return completedManualScoreTest;
            };

            Assignment.prototype.$publishScores = function() {
                throw new Error('You should use AssignmentFacadeService.publishScores');
            };

            Assignment.prototype.$getAssigneesName = function(classRoster, groupsList) {
                var self = this;
                return AssignmentUtil.getAssigneesName(
                    self.classUuids,
                    self.groupUuids,
                    self.studentUuids,
                    self.studentMetadata,
                    classRoster,
                    groupsList
                );
            };

            Assignment.prototype.$getStudentUserAssignmentId = function(studentId) {
                var self = this,
                    metadata = self.$getPrimaryMetadata(studentId),
                    studentUserAssignmentId;

                if (!metadata) {
                    $log.error('Unable to find matching student metadata', self, studentId);
                } else {
                    studentUserAssignmentId = metadata.userAssignmentId;
                    return studentUserAssignmentId;
                }
            };

            Assignment.prototype.getFilteredStudentList = function(studentMetadata) {
                // Applying filter to get details of only those students for which teacher is authorised
                //      to read/modify/create.
                var studentList = {},
                    studentsFound = _.filter(studentMetadata, function(student) { return student.studentInfo; });

                studentList.notStarted = _.where(studentsFound, {status: 'not_started'});
                studentList.inProgress = _.where(studentsFound, {status: 'in_progress'});
                studentList.completed = _.filter(studentsFound, function(student) {
                    return student.status === 'completed' || student.status === 'submitted';
                });
                return studentList;
            };

            Assignment.prototype.getFilteredCompletedStudentList = function(isLesson, studentData) {
                // Applying filter to get details of only those students who completed the assignmnet and teacher
                //      is authorised to read/modify/create same.
                if (isLesson) {
                    angular.forEach(studentData, function(metadataList, key) {
                        studentData[key] = _.filter(metadataList, function(metadata) {
                            return metadata.studentInfo;
                        });
                    });
                } else {
                    studentData = _.filter(studentData, function(student) {
                        return student.studentInfo;
                    });
                }

                return studentData;
            };

            Assignment.prototype.getSortedCompletedStudentList = function(isLesson, studentData) {

                if (isLesson) {
                    angular.forEach(studentData, function(metadataList, key) {
                        studentData[key] = _.sortBy(metadataList, function(metadata) {
                            return metadata.studentInfo.lastFirst;
                        });
                    });
                } else {
                    studentData = _.sortBy(studentData, function(student) {
                        return student.studentInfo.lastFirst;
                    });
                }

                return studentData;
            };

            Assignment.prototype.isSubmitted = function() {
                return this.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED;
            };

            Assignment.prototype.isSubmittedOrCompleted = function() {
                return this.isSubmitted() || this.$isCompleted();
            };

            Assignment.prototype.getPrimaryMetadata =  Assignment.prototype.$getPrimaryMetadata;
            Assignment.prototype.findItemMetadata =  Assignment.prototype.$findItemMetadata;
            Assignment.prototype.getAssignmentStatus =  Assignment.prototype.$getAssignmentStatus;
            Assignment.prototype.getItemStatus =  Assignment.prototype.$getItemStatus;
            Assignment.prototype.isLesson = Assignment.prototype.$isLesson;
            Assignment.prototype.getLessonItems = Assignment.prototype.$getLessonItems;
            Assignment.prototype.getUserAttachment = Assignment.prototype.$getUserAttachment;
            Assignment.prototype.getAssigneesName = Assignment.prototype.$getAssigneesName;
            Assignment.prototype.notScoredCount = Assignment.prototype.$notScoredCount;
            Assignment.prototype.notSentScoreCount = Assignment.prototype.$notSentScoreCount;
            Assignment.prototype.isCompleted = Assignment.prototype.$isCompleted;
            Assignment.prototype.isPastDue = Assignment.prototype.$isPastDue;
            Assignment.prototype.getTitle = Assignment.prototype.$getTitle;
            Assignment.prototype.isLate = Assignment.prototype.$isLate;

            return Assignment;
        }
    ]);
