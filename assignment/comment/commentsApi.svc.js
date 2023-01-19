angular.module('Realize.comment.commentsApiService', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.Discussions'
])
    .constant('COMMENT_ENTITIES', {
        CLASS: 'class',
        STUDENT: 'student'
    })
    .service('commentsApiService', [
        '$rootScope',
        '$q',
        '$http',
        '$window',
        '$log',
        'PATH',
        'DiscussModelCustomizations',
        function($rootScope, $q, $http, $window, $log, PATH, DiscussModelCustomizations) {
            'use strict';
            var svc = this,
                commentBoardUrl = $window.discussionApiUrl + '/discussions/boards',
                boardIdPlaceholder = ':boardId',
                boardAccessUrl = [commentBoardUrl, boardIdPlaceholder, 'boardAccessInfos'].join('/'),
                boardSummaryUrl = [commentBoardUrl, 'summary'].join('/'),
                headers = {
                    headers: {'Content-Type': 'application/json'},
                    service: 'comments'
                };

            function makeGetBoardsSummaryCallByExternalIds(externalIds) {
                var options = angular.extend({}, headers);

                options.params = {
                    externalIds: externalIds.join(',')
                };

                return $http.get(boardSummaryUrl, options)
                    .then(function(response) {
                        return response.data.data.boardsSummary;
                    }, function(response) {
                        return $q.reject(response);
                    });
            }

            svc.createNewBoard = function(userAssignmentId) {
                return $http.post(PATH.REST + '/comments/boards', {'userAssignmentId': userAssignmentId})
                           .then(function(response) {
                               return response.data;
                           }, function(response) {
                               //Board already exists for a given user assignment id - (409 --> CONFLICT)
                               if (response.status === 409) {
                                   return svc.getBoardId(userAssignmentId);
                               } else {
                                   return $q.reject(response);
                               }
                           });
            };

            Object.defineProperty(svc, 'NON_EXISTANT_BOARD_ERROR', {
                get: function() { return -1; }
            });

            svc.getBoardId = function(userAssignmentId) {
                var options = angular.extend({}, headers),
                    externalIds = [];
                externalIds.push('comment', 'userassign:' + userAssignmentId);
                options.params = {
                    externalIds: externalIds.join(',')
                };
                var promise = $http.get(commentBoardUrl, options)
                    .then(function(response) {
                        if (response.data.data.boards.length === 0) {
                            return $q.reject(svc.NON_EXISTANT_BOARD_ERROR);
                        }
                        return response.data.data.boards[0].id.replace(/['"']+/g, '');
                    });
                return promise;
            };

            svc.createPost = function(postedText, boardId) {
                //comments don't have title so sending in an empty string
                var post = {
                        title: '',
                        body: postedText
                    },
                commentPostUrl = commentBoardUrl + '/' + boardId + '/posts';
                return $http.post(commentPostUrl, JSON.stringify(post), headers)
                    .then(function(response) {
                        return DiscussModelCustomizations.transformPostsIn(response.data.data);
                    })
                    .catch(function(error) {
                        return $q.reject(error);
                    });
            };

            svc.getPosts = function(boardId) {
                var postsUrl = [commentBoardUrl, boardId, 'posts'].join('/'),
                    boardAccessUrlWithBoardId = boardAccessUrl.replace(boardIdPlaceholder, boardId),
                    promises = [],
                    deferred = $q.defer();

                promises.push($http.get(postsUrl, headers));
                promises.push($http.post(boardAccessUrlWithBoardId, JSON.stringify({}), headers));

                $q.all(promises).then(function(responses) {
                    var getPostsResponse = responses[0],
                        boardAccessInfoResponse = responses[1],
                        posts = getPostsResponse.data.data.posts,
                        boardAccessInfo = boardAccessInfoResponse.data.data;

                    return DiscussModelCustomizations.transformPostsIn(posts)
                        .then(function(transformedPosts) {
                            deferred.resolve({posts: transformedPosts, boardAccessInfo: boardAccessInfo});
                        }, function(error) {
                            $log.error('Could not transforms the posts list due to: ', error);
                            deferred.reject(error);
                        });

                })
                .catch(function(error) {
                    deferred.reject(error);
                });

                return deferred.promise;
            };

            svc.getBoardsSummaryByAssignmentId = function(assignmentId, userAssignmentId) {
                var externalIds = [];

                externalIds.push('comment', 'assign:' + assignmentId);
                if (userAssignmentId) {
                    externalIds.push('userassign:' + userAssignmentId);
                }
                return makeGetBoardsSummaryCallByExternalIds(externalIds);
            };

            svc.getBoardsSummaryByClassId = function(classId, userAssignmentId) {
                var externalIds = [];

                externalIds.push('comment', 'class:' + classId);
                if (userAssignmentId) {
                    externalIds.push('userassign:' + userAssignmentId);
                }
                return makeGetBoardsSummaryCallByExternalIds(externalIds);
            };

            svc.updatePost = function(boardId, postId, postText) {
                var post = JSON.stringify({
                        title: '',
                        body: postText
                    }),
                    updateUrl = [commentBoardUrl, boardId, 'posts', postId].join('/');

                return $http.post(updateUrl, post, headers).then(function(response) {
                    return DiscussModelCustomizations.transformPostsIn(response.data.data);
                }, function(error) {
                    $log.error(error);
                });
            };

            svc.deletePost = function(boardId, postId) {
                var postArchived = JSON.stringify({archived: true}),
                    deleteUrl = [commentBoardUrl, boardId, 'posts', postId].join('/');
                return $http.post(deleteUrl, postArchived, headers);
            };

            svc.unDeletePost = function(boardId, postId) {
                var postUnarchived = JSON.stringify({archived: false}),
                unDeleteUrl = [commentBoardUrl, boardId, 'posts', postId].join('/');
                return $http.post(unDeleteUrl, postUnarchived, headers);
            };

            svc.getBoardAccessInfo = function(boardId) {
                var boardAccessUrlWithBoardId = boardAccessUrl.replace(boardIdPlaceholder, boardId);

                return $http.get(boardAccessUrlWithBoardId, headers)
                    .then(function(response) {
                        return response.data.data;
                    }, function(response) {
                        if (response.status === 404) {
                            return {};
                        }
                        return $q.reject(response);
                    });
            };
        }
    ]);
