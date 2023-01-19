angular.module('Realize.Discussions.Resolve', [
    'Realize.paths'
])
    .factory('GetMomentLib', ['DISCUSSION_UI_DIST_PATH',
        '$q',
        function(DISCUSSION_UI_DIST_PATH, $q) {
            'use strict';
            var getMomentLib = function() {
                var path = DISCUSSION_UI_DIST_PATH + '/lib/moment/2.8.3';

                var momentLoaded = $q.defer();

                // Note: some discussion service 3rd party libs are loaded from index.
                // Deferred script loading allows new dependencies to be added post Realize code freeze.
                $.ajax({
                    url: path + '/moment.min.js',
                    dataType: 'script',
                    cache: true,
                    success: function() {
                        momentLoaded.resolve();
                    },
                    error: function() {
                        momentLoaded.reject();
                    }
                });

                return momentLoaded.promise;
            };

            return getMomentLib;
        }])

    .factory('GetBoardId', ['$route',
            'DiscussRestAPIEndpoints',
            '$location',
            '$q',
            '$rootScope',
            function($route, DiscussRestAPIEndpoints, $location, $q, $rootScope) {
                'use strict';
                var getBoardId = function() {
                    var classId, boardId;

                    classId = $route.current.params.classId;

                    return DiscussRestAPIEndpoints.getBoards(classId).then(function(result) {
                        if (result.data.boards.length === 0 && $rootScope.currentUser.isTeacher) {
                            var board = {context: classId};

                            return DiscussRestAPIEndpoints.createBoard(board).then(function(result) {
                                return result.data.id;
                            });

                        } else if (result.data.boards[0] && result.data.boards[0].id) {
                            //in Realize there is a 1-1 mapping of context to boardId
                            //so we will always want boards[0]
                            boardId = result.data.boards[0].id;

                        } else {

                            boardId = null;
                        }

                        return boardId;
                    });
                };

                return getBoardId;
            }])
    .factory('GetPostForAssignment', ['$route',
        'DiscussRestAPIEndpoints',
        function($route, DiscussRestAPIEndpoints) {
            'use strict';
            var getPost = function() {
                var classId, assignmentId, itemId, externalIds = [];

                classId = $route.current.params.classId;
                assignmentId = $route.current.params.assignmentId;
                itemId = $route.current.params.itemId;
                externalIds.push('assign:' + assignmentId);
                externalIds.push('class:' + classId);
                externalIds.push('prompt');

                return DiscussRestAPIEndpoints.getBoardsByExternalIds(externalIds, true).then(function(result) {
                    var itemPost = null;
                    if (result.data.boards.length > 0) {
                        var board = result.data.boards[0];
                        itemPost = _.find(board.posts, function(post) {
                            if (post.meta && post.meta.item && post.meta.item === itemId) {
                                return post;
                            }
                        });
                    }
                    return itemPost;
                });
            };

            return getPost;
        }])
    .factory('GetClassMembers', [
        '$http',
        '$route',
        'REST_PATH',
        function($http, $route, restPath) {
            'use strict';

            return function(classId) {
                var _classId = classId || $route.current.params.classId;
                return $http.get(restPath + '/class_roster/' + _classId + '/members')
                    .then(function(response) {
                        return response.data;
                    });
            };
        }
    ])
    .factory('GetPostItem', [
       'Content',
        function(Content) {
            'use strict';

            return function(post) {
                var params = {},
                    stripnulls = true,
                    cache = false,
                    skipInsertCustomized = true;

                params.contentId = post.meta.item;
                params.version = post.meta.itemVersion;

                if (!params.version) {
                    params.version = 0;
                }

                return Content.get(params, stripnulls, cache, skipInsertCustomized);
            };
        }
    ]);
