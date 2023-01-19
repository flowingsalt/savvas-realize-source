angular.module('Realize.assignment.tabStudent', [//TODO: Rename this
    'Realize.assignment.facadeService',
    'Realize.assignment.viewOptions',
    'Realize.common.mediaQueryService',
    'Realize.comment.commentsUtilService',
    'Realize.assignment.constants',
    'rlzComponents.assignmentTelemetryModule',
    'rlzComponents.routedComponents.assignments.constants',
    'rlzComponents.components.featureManagement',
    'rlzComponents.components.assignment.services'
])
    .directive('assignmentTabStudent', [
        function() {
            'use strict';

            return {
                scope: {
                    assignments: '=?',
                    status: '@',
                    active: '@',
                    total: '=',
                    roster: '=',
                    studentId: '=',
                    studentName: '='
                },
                templateUrl: 'templates/assignment/assignmentTabStudent.html',
                controller: [
                    '$log',
                    '$scope',
                    '$location',
                    'AssignmentFacadeService',
                    'AssignmentViewOptions',
                    '$rootScope',
                    'lwcI18nFilter',
                    'MediaQuery',
                    '$filter',
                    '$routeParams',
                    'OptionalFeatures',
                    'commentsUtilService',
                    'ASSIGNMENT_CONSTANTS',
                    'assignmentTelemetryService',
                    'ASSIGNMENT_TELEMETRY_CONSTANTS',
                    'featureManagementService',
                    'assignmentScoreHelperService',
                    function($log, $scope, $location, AssignmentFacadeService, AssignmentViewOptions, $rootScope,
                        lwcI18nFilter, MediaQuery, $filter, $routeParams, OptionalFeatures, commentsUtilService,
                        ASSIGNMENT_CONSTANTS, assignmentTelemetryService, ASSIGNMENT_TELEMETRY_CONSTANTS,
                        featureManagementService, assignmentScoreHelperService) {

                        $scope.requestFilter = AssignmentViewOptions.getStudentFilterByStatus($scope.status);
                        $scope.pageSize = $scope.requestFilter.pageSize;
                        $scope.studentAssignmentIdsWithPosts = {};
                        $scope.isOtherCallLoading = false;
                        $scope.MAX_ADAPTIVE_SCORE = 5;
                        $scope.fetchCommentsForFirstTabTriggered = false;
                        var SORT_OPTIONS = { dueDate: ASSIGNMENT_CONSTANTS.DUE_DATE },
                            commentSummaryLoaded = false,
                            user = $rootScope.currentUser,
                            isNewNotificationRequired = function(board) {
                                if (angular.isDefined(board)) {
                                    return board.lastModifiedDate > board.lastAccessDate;
                                }
                            },
                            loadAssignmentComments = function() {
                                if (OptionalFeatures.isAvailable(ASSIGNMENT_CONSTANTS.OPTIONAL_FEATURES.COMMENTS)) {
                                    commentsUtilService
                                        .getStudentAssignmentIdsWithPostsByClassId($routeParams.classId)
                                        .then(function(output) {
                                            angular.extend($scope.studentAssignmentIdsWithPosts, output);
                                            commentSummaryLoaded = true;
                                            $rootScope.pageLoaded();
                                        })
                                        .catch(function() {
                                            $rootScope.pageLoaded();
                                        });
                                } else {
                                    $rootScope.pageLoaded();
                                }
                            },
                            saveStudentTabSortOptions = function() {
                                var status = $scope.status;
                                var attributeValue = {sortField: $scope.requestFilter.sortField,
                                    sortOrder: $scope.requestFilter.sortOrder};
                                if (status === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED) {
                                    user.setAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.NOT_STARTED,
                                        attributeValue, true);
                                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS) {
                                    user.setAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.IN_PROGRESS,
                                        attributeValue, true);
                                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED) {
                                    user.setAttribute(ASSIGNMENT_CONSTANTS.ASSIGNMENT_STATUS.COMPLETED,
                                        attributeValue, true);
                                }
                            },

                            telemetryDefinitionName = function() {
                                var definitionName;
                                if ($scope.requestFilter.sortField === ASSIGNMENT_CONSTANTS.DUE_DATE) {
                                    definitionName = lwcI18nFilter('assignmentList.columnHeader.dueDate.label');
                                } else {
                                    definitionName = ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING;
                                }
                                return definitionName;
                            },

                            telemetryDescription = function() {
                                var description;
                                if ($scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC) {
                                    description = ASSIGNMENT_TELEMETRY_CONSTANTS.DESCRIPTION.ASC;
                                } else {
                                    description = ASSIGNMENT_TELEMETRY_CONSTANTS.DESCRIPTION.DESC;
                                }
                                return description;
                            },

                            telemetryAssignmentStatus = function() {
                                var status = $scope.status;
                                var assignmentStatus;
                                if (status === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED) {
                                    assignmentStatus = ASSIGNMENT_TELEMETRY_CONSTANTS.STATUS.NOT_STARTED;
                                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS) {
                                    assignmentStatus = ASSIGNMENT_TELEMETRY_CONSTANTS.STATUS.IN_PROGRESS;
                                } else if (status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED) {
                                    assignmentStatus = ASSIGNMENT_TELEMETRY_CONSTANTS.STATUS.COMPLETED;
                                }
                                return assignmentStatus;
                            },

                            loadAssignments = function() {
                                $scope.loading = true;
                                $scope.requestFilter.includeLessonDetails = false;
                                loadAssignmentComments();
                                return AssignmentFacadeService.getStudentAssignmentsByStatus(
                                    $scope.roster.classId,
                                    $scope.studentId,
                                    $scope.status,
                                    $scope.requestFilter
                                ).then(
                                    function(result) {
                                        $scope.assignments = result.assignments;
                                        AssignmentFacadeService.getAssignmentsWithExternalProviderData(result);
                                        if (!MediaQuery.breakpoint.isDesktop) {
                                            $('html, body').animate({ scrollTop: 0 }, 0);
                                        }
                                        if (!$scope.isOtherCallLoading) {
                                            $scope.loading = false;
                                        }
                                    }
                                );
                            };
                        var MEDIA_TYPE = {
                            PLAYLIST: 'PLAYLIST'
                        };
                        $scope.roleBasedMessages = {
                            not_started_zero: 'assignmentListStudent.zeroState.noNotStarted.message',
                            progress_zero: 'assignmentListStudent.zeroState.noInProgress.message',
                            completed_zero: 'assignmentListStudent.zeroState.noCompleted.message'
                        };

                        $scope.pageStart = function() {
                            return (($scope.requestFilter.page - 1) * $scope.requestFilter.pageSize) + 1;
                        };

                        $scope.pageEnd = function() {
                            return (($scope.requestFilter.page * $scope.requestFilter.pageSize) <= $scope.total) ?
                                $scope.requestFilter.page * $scope.requestFilter.pageSize :
                                $scope.total;
                        };

                        $scope.getOverrideMediaType = function(assignment) {
                            var override = (assignment.type === MEDIA_TYPE.PLAYLIST) ?
                                MEDIA_TYPE.PLAYLIST.toLowerCase() : undefined;
                            return override;
                        };

                        $scope.assignmentSortByAscOrDescAria = function() {
                            var sorted = {
                                ascending: 'assignmentListStudent.columnHeader.sortedAscending',
                                descending: 'assignmentListStudent.columnHeader.sortedDescending'
                            };

                            return $scope.requestFilter.sortOrder === 'ASC' ?
                                sorted.ascending : sorted.descending;
                        };

                        $scope.showNewCommentNotification = function(assignment) {
                            var meta = assignment.$findItemMetadata(assignment.itemUuid, $scope.studentId),
                                userAssignmentId;
                            if (!angular.isDefined(meta)) {
                                return false;
                            }
                            userAssignmentId = meta.userAssignmentId;
                            return isNewNotificationRequired($scope.studentAssignmentIdsWithPosts[userAssignmentId]);
                        };

                        $scope.sortBy = function(e, sortBy) {
                            if (e) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                            $scope.requestFilter.sortOrder = $scope.requestFilter.sortField !== SORT_OPTIONS[sortBy] ?
                                'ASC' : ($scope.requestFilter.sortOrder === 'ASC' ? 'DESC' : 'ASC');
                            $scope.requestFilter.page = 1;
                            $scope.requestFilter.sortField = SORT_OPTIONS[sortBy];
                            saveStudentTabSortOptions();
                            loadAssignments();
                            assignmentTelemetryService.sendAssignmentSortTelemetryEvent(telemetryDefinitionName(),
                                telemetryDescription(), ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING,
                                telemetryAssignmentStatus());
                        };

                        $scope.getSortSelectors = function() {
                            var selectors = ['sortBy'];
                            selectors.push($scope.requestFilter.sortOrder === ASSIGNMENT_CONSTANTS.ASC ?
                                    'icon-sort-down' : 'icon-sort-up');
                            return selectors;
                        };

                        $scope.open = function(e, assignment) {
                            // don't change location if this is the event click for the download link
                            if (e) {
                                e.stopPropagation();
                                if (e.target) {
                                    if (e.target.hasAttribute('download')) { return; }
                                    if (e.target.href && e.target.href.search('/download/') >= 0) { return; }
                                }
                                e.preventDefault();
                            }

                            var p = $location.path();

                            $location.path(p + '/' + assignment.assignmentId);
                        };

                        $scope.justCompleted = function(assignment) {
                            return $scope.completedAssignmentId &&
                                assignment.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED &&
                                assignment.assignmentId === $scope.completedAssignmentId;
                        };

                        $scope.needScoreStudent = function(assignment) {
                            return assignment.hasManualScore && (assignment.hasNotSentScore || assignment.hasNotScored);
                        };

                        $scope.showScore = function(assignment) {
                            var scoredManualScore = assignment.hasManualScore && !assignment.hasNotSentScore &&
                                !assignment.hasNotScored,
                                scoredAutoScore = !assignment.hasManualScore && assignment.averageScore !== null;
                            return (scoredManualScore || scoredAutoScore) && !assignment.isAdaptiveAssignment() &&
                                !assignment.hasEssayScoring;
                        };

                        $scope.showEssayScores = function(assignment) {
                            var metaData = assignment.studentMetadata[0];
                            var score = AssignmentFacadeService.getEssayScore(metaData, assignment.maxScore);
                            return [$filter('number')(score, 0), assignment.maxScore].join('/');
                        };

                        $scope.showAdaptiveScore = function(assignment) {
                            var metadata = assignment.studentMetadata[0];
                            var contentItem = assignment.contentItem;
                            var info = assignmentScoreHelperService.getScoreInfo(assignment, contentItem, metadata);
                            return info.scoreDisplayText;
                        };

                        $scope.showStar = function(assignment) {
                            var scoredAutoScore = !assignment.hasManualScore && assignment.averageScore !== null;
                            return scoredAutoScore && assignment.isAdaptiveAssignment() &&
                                !featureManagementService.isKnewtonRecommendationDisabled();
                        };

                        $scope.showFraction = function(assignment) {
                            var scoredAutoScore = !assignment.hasManualScore && assignment.averageScore !== null;
                            return scoredAutoScore && assignment.isAdaptiveAssignment() &&
                                featureManagementService.isKnewtonRecommendationDisabled();
                        };

                        $scope.showDash = function(assignment) {
                            return !assignment.hasManualScore &&
                                (_.isNull(assignment.averageScore) || _.isUndefined(assignment.averageScore));
                        };

                        $scope.getAdaptiveScore = function(assignment) {
                            return $filter('number')(assignment.averageScore, 0);
                        };

                        //Watchers
                        $scope.$watch('requestFilter.pageSize', function(newPageSize) {
                            var num = Math.ceil($scope.total / newPageSize);
                            $scope.pages = _.range(1, num + 1);
                        });

                        $scope.$watch('requestFilter.page', function(newPage, oldPage) {
                            if (oldPage && newPage !== oldPage) {
                                loadAssignments();
                            }
                        });

                        $scope.$watch('active', function(activeTab) {
                            if (!$scope.assignments && activeTab === $scope.status) {
                                loadAssignments();
                            }
                            if (_.isEmpty($scope.studentAssignmentIdsWithPosts) &&
                                !$scope.fetchCommentsForFirstTabTriggered) {
                                $scope.fetchCommentsForFirstTabTriggered = true;
                                loadAssignmentComments();
                            }
                        });
                    }
                ]
            };
        }
    ]);
