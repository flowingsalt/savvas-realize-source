angular.module('Realize.comment.commentsUtilService', [
        'Realize.analytics'
    ])
    .service('commentsUtilService', [
        '$log',
        'lwcI18nFilter',
        'Analytics',
        'commentsApiService',
        function($log, lwcI18nFilter, Analytics, commentsApiService) {
            'use strict';

            var svc = this;

            function buildStudentAssignmentIdsWithPostsObject(boards) {
                return boards.reduce(function(output, board) {
                    var studentAssignmentId = board.externalIds.filter(function(externalId) {
                        return externalId.indexOf('userassign') !== -1;
                    })[0].split(':').reverse()[0];
                    output[studentAssignmentId] = {
                        boardId: board.id,
                        lastAccessDate: board.lastAccessDate ? board.lastAccessDate : '',
                        lastModifiedDate: board.lastModifiedDate ? board.lastModifiedDate : '',
                        postsCount: board.postsCount
                    };
                    return output;
                }, {});
            }

            svc.getStudentAssignmentIdsWithPostsByAssignmentId = function(assignmentId, userAssignmentId) {
                return commentsApiService.getBoardsSummaryByAssignmentId(assignmentId, userAssignmentId)
                    .then(function(boards) {
                        return buildStudentAssignmentIdsWithPostsObject(boards);
                    });
            };

            svc.getStudentAssignmentIdsWithPostsByClassId = function(classId, userAssignmentId) {
                return commentsApiService.getBoardsSummaryByClassId(classId, userAssignmentId)
                    .then(function(boards) {
                        return buildStudentAssignmentIdsWithPostsObject(boards);
                    });
            };

            svc.getLastAccessDateForStudentAssignmentId = function(studentAssignmentId, studentAssignmentIdsWithPosts) {
                if (studentAssignmentId in studentAssignmentIdsWithPosts) {
                    return studentAssignmentIdsWithPosts[studentAssignmentId].lastAccessDate;
                }
            };

            svc.getBoardIdForStudentAssignmentId = function(studentAssignmentId, studentAssignmentIdsWithPosts) {
                if (studentAssignmentId in studentAssignmentIdsWithPosts) {
                    return studentAssignmentIdsWithPosts[studentAssignmentId].boardId;
                }
            };

            svc.getCommentLinkText = function(student, studentAssignmentIdsWithPosts) {
                var commentText = '';
                if (student.userAssignmentId in studentAssignmentIdsWithPosts) {
                    var board = studentAssignmentIdsWithPosts[student.userAssignmentId];
                    if (student.hasCommentRowExpanded) {
                        commentText = lwcI18nFilter('comment.action.closeComment');
                    } else if (board.postsCount > 0) {
                        commentText = lwcI18nFilter('comment.action.viewComments');
                    }
                }

                if (commentText === '') {
                    if (student.hasCommentRowExpanded) {
                        commentText = lwcI18nFilter('comment.action.closeComment');
                    } else {
                        commentText = lwcI18nFilter('comment.action.makeComment');
                    }
                }
                return commentText;
            };

            svc.getCommentBadgeText = function(student, studentAssignmentIdsWithPosts) {
                var badgeText = '';
                if (student.userAssignmentId in studentAssignmentIdsWithPosts) {
                    var board = studentAssignmentIdsWithPosts[student.userAssignmentId];
                    if (board.postsCount > 0) {
                        if (student.hasCommentRowExpanded || board.lastAccessDate > board.lastModifiedDate) {
                            badgeText = board.postsCount;
                        } else {
                            badgeText = lwcI18nFilter('comment.action.newMessageNotification');
                        }
                    }
                }
                return badgeText;
            };

            svc.analyticsForCommentPost = function(description) {
                Analytics.track('track.action', {
                    category: 'Classes',
                    action: 'Assignments',
                    label: description
                });
            };

            svc.createNewBoard = function(boardId, commentDate) {
                return {
                    boardId: boardId,
                    lastAccessDate: commentDate,
                    lastModifiedDate: commentDate,
                    postsCount: 0
                };
            };
        }
    ]);
