angular.module('Realize.comment.writeCommentForm', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.comment.commentsApiService'
])
    .directive('writeCommentForm', [
        '$log',
        'PATH',
        function($log, PATH) {
            'use strict';
            return {
                restrict: 'EA',
                templateUrl: PATH.TEMPLATE_CACHE + '/assignment/comment/commentsWidget/writeComment' +
                '/writeCommentForm.dir.html',
                scope: {
                    //If you don't have boardId, then must pass userAssignmentId
                    userAssignmentId: '@?',
                    boardId: '@?',
                    postId: '@?',
                    postText: '@?'
                },
                controller: 'WriteCommentsFormCtrl',
                controllerAs: 'writeCommentsFormCtrl'
            };
        }
    ])
    .controller('WriteCommentsFormCtrl', [
        '$q',
        '$scope',
        '$log',
        'commentsApiService',
        function($q, $scope, $log, commentsApiService) {
            'use strict';

            var ctrl = this,
                doCreateBoard = false,
                boardId = $scope.boardId,
                userAssignmentId = $scope.userAssignmentId,
                postId = $scope.postId,
                postText = $scope.postText;

            this.isEditMode = angular.isDefined(postId) && angular.isDefined(postText);

            this.postCancel = function() {
                $scope.$emit('writecomment.post.cancel');
            };

            if (!boardId) {
                if (!userAssignmentId || this.isEditMode) {
                    if (this.isEditMode) {
                        $log.warn('WriteCommentForm requires boardId and postId when editing a comment');
                    } else {
                        $log.warn('WriteCommentForm requires either boardId or userAssignmentId');
                    }

                    this.postCancel();
                } else {
                    commentsApiService.getBoardId(userAssignmentId)
                        .then(function(response) {
                            boardId = response;
                        })
                        .catch(function(error) {
                            if (error === commentsApiService.NON_EXISTANT_BOARD_ERROR) {
                                doCreateBoard = true;
                            }
                        });
                }
            }

            if (this.isEditMode) {
                this.writtenComment = postText;
            }

            function postCommentToBoard(comment) {
                commentsApiService.createPost(comment, boardId)
                    .then(function(post) {
                        //pass boardId in case we generate it here and outer scope needs it
                        //this way it won't have to call api to get boardId
                        $scope.$emit('writecomment.post.comment', post);
                    })
                    .catch(function(err) {
                        $scope.$emit('writecomment.post.error', err);
                    });
            }

            function postComment() {
                if (boardId) {
                    postCommentToBoard(ctrl.writtenComment);
                } else if (doCreateBoard) {
                    commentsApiService.createNewBoard(userAssignmentId)
                        .then(function(bId) {
                            boardId = bId;
                            doCreateBoard = false;
                            postCommentToBoard(ctrl.writtenComment);
                        })
                        .catch(function(err) {
                            $scope.$emit('writecomment.boardcreate.error', err);
                        });
                }
            }

            function updateComment() {
                commentsApiService.updatePost(boardId, postId, ctrl.writtenComment)
                    .then(function(updatedComment) {
                        $scope.$emit('writecomment.post.update', updatedComment);
                    })
                    .catch(function(err) {
                        $scope.$emit('writecomment.post.error', err);
                    });
            }

            this.saveComment = _.throttle(function() {
                if (this.isEditMode) {
                    updateComment();
                } else {
                    postComment();
                }
            }.bind(this), 1000, {trailing: false});
        }
    ]);
