angular.module('Realize.comment.commentsWidget', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.comment.commentsApiService',
    'Realize.common.alerts',
    'ngSanitize',
    'Realize.Comment.DisplayTime',
    'Realize.user.currentUser'
])
    .directive('commentsWidget', [
        '$log',
        'PATH',
        function($log, PATH) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/assignment/comment/commentsWidget/commentsWidget.dir.html',
                scope: {
                    userAssignmentId: '@',
                    commentsList: '=?',
                    boardId: '@',
                    lastAccessDate: '@',
                    showComments: '='
                },
                controller: 'CommentsWidgetCtrl',
                controllerAs: 'commentsWidgetCtrl'
            };
        }
    ])
    .controller('CommentsWidgetCtrl', [
    '$scope',
    '$log',
    '$q',
    'commentsApiService',
    'InlineAlertService',
    'lwcI18nFilter',
    '$currentUser',
    function($scope, $log, $q, commentsApiService, InlineAlertService, lwcI18nFilter, currentUser) {
        'use strict';
        var ctrl = this;
        this.userAssignmentId = $scope.userAssignmentId;
        this.isEditorVisible = false;
        this.boardId = $scope.boardId;
        this.lastAccessDate = $scope.lastAccessDate;
        this.isListVisible = $scope.showComments;
        $scope.commentsList = $scope.commentsList || [];

        function addNewCommentFlag(posts) {
            posts.forEach(function(post) {
                post.isNewPost = currentUser.userId !== post.author && post.modifiedDate > ctrl.lastAccessDate;
            });
        }

        this.updateCommentList = function(newComment) {

            var hasDeletedComments = $scope.commentsList.some(function(comment) {
                return comment.isDeleted;
            });

            if (newComment && hasDeletedComments) {
                //don't fully update the list, just put the new comment on top
                $scope.commentsList.unshift(newComment);
                ctrl.isListVisible = true;
                return $q.when(true);
            }

            //fully update list as new comments may have come in
            return commentsApiService.getPosts(this.boardId)
                .then(function(response) {
                    var posts = response.posts;
                    addNewCommentFlag(posts);
                    $scope.commentsList = posts;
                    $scope.$emit('CommentsWidgetCtrl.updateCommentList.listComment',
                            ctrl.userAssignmentId,
                            $scope.commentsList.length,
                            response.boardAccessInfo.lastAccessDate);
                    ctrl.isListVisible = true;
                });
        };

        this.toggleEditorVisible = function() {
            this.isEditorVisible = !this.isEditorVisible;

            if (this.isEditorVisible) {
                $scope.commentsList.forEach(function(comment) {
                    comment.isInEditMode = false;
                });
            }
        };

        $scope.$on('listcomment.post.editmode', function() {
            ctrl.isEditorVisible = false;
        });

        $scope.$on('writecomment.post.comment', function(event, newComment) {
            ctrl.isEditorVisible = false;
            var successPostCommentMsg = [
                '<strong>',
                lwcI18nFilter('comment.successNotification.postComment.title'),
                '</strong> ',
                lwcI18nFilter('comment.successNotification.postComment.message')
                ].join('');
            ctrl.boardId = ctrl.boardId || newComment.boardId;
            ctrl.updateCommentList(newComment)
                .then(function() {
                    InlineAlertService.addAlert(
                        $scope.commentsList[0].id, {
                            type: 'success',
                            msg: successPostCommentMsg
                        }
                    );
                });
        });

        $scope.$on('writecomment.post.cancel', function() {
            ctrl.isEditorVisible = false;
        });

        $scope.$watch('showComments', function() {
            if ($scope.showComments) {
                if (ctrl.boardId) {
                    ctrl.updateCommentList();
                } else {
                    commentsApiService.getBoardId(ctrl.userAssignmentId)
                        .then(function(response) {
                            ctrl.boardId = response;
                            ctrl.updateCommentList();
                        });
                }
            } else {
                ctrl.isListVisible = false;
            }
        });
    }
    ]);
