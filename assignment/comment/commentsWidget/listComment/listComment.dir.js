angular.module('Realize.comment.listComment', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.comment.commentsApiService',
    'Realize.comment.writeCommentForm',
    'Realize.Comment.DisplayTime',
    'Realize.common.alerts',
    'Realize.user.currentUser',
    'ngSanitize'
])
    .directive('listComment', [
        '$log',
        'PATH',
        function($log, PATH) {
            'use strict';
            return {
                restrict: 'EA',
                templateUrl: PATH.TEMPLATE_CACHE + '/assignment/comment/commentsWidget/listComment/' +
                'listComment.dir.html',
                controller: 'ListCommentsCtrl',
                controllerAs: 'listCommentsCtrl'
            };
        }
    ])
    .controller('ListCommentsCtrl', [
        '$scope',
        '$log',
        '$currentUser',
        'InlineAlertService',
        'lwcI18nFilter',
        'commentsApiService',
        function($scope, $log, currentUser, InlineAlertService, lwcI18nFilter, commentsApiService) {
            'use strict';

            this.deletePost = function(post) {
                commentsApiService.deletePost(post.boardId, post.id).then(function() {
                    post.isDeleted = true;
                    $scope.$emit('ListCommentsCtrl.deletePost');
                }, function(error) {
                    $log.error('Error %s in deleting the post: %s', error, post.id);
                });
            };

            this.unDeletePost = function(post) {
                commentsApiService.unDeletePost(post.boardId, post.id).then(function() {
                    post.isDeleted = false;
                    $scope.$emit('ListCommentsCtrl.unDeletePost');
                }, function(error) {
                    $log.error('Error %s in undo deleting the post: %s', error, post.id);
                });
            };

            this.canDelete = function(post) {
                return currentUser.userId === post.author || currentUser.isTeacher;
            };

            function setAllEditModeFalse() {
                $scope.commentsList.forEach(function(comment) {
                    comment.isInEditMode = false;
                });
            }

            this.editPost = function(event, post) {
                if (event) {
                    event.preventDefault();
                }
                setAllEditModeFalse();
                post.isInEditMode = true;
                $scope.$emit('listcomment.post.editmode');
            };

            this.canEdit = function(post) {
                return currentUser.userId === post.author;
            };

            $scope.$on('writecomment.post.update', function(event, comment) {
                var commentInEditing = $scope.commentsList.filter(function(com) {
                    return com.isInEditMode;
                })[0];

                angular.extend(commentInEditing, comment);
                commentInEditing.isInEditMode = false;

                InlineAlertService.addAlert(
                    commentInEditing.id,
                    {
                        type: 'success',
                        msg: [
                            '<strong>',
                            lwcI18nFilter('comment.successNotification.postComment.title'),
                            '</strong>',
                            lwcI18nFilter('comment.successNotification.editComment.message')
                        ].join('')
                    }
                );
            });

            $scope.$on('writecomment.post.cancel', function(event) {
                //prevent default so outer scope can know if event handled already
                event.preventDefault();

                setAllEditModeFalse();
            });
        }
    ]);
