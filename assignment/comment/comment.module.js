angular.module('Realize.comments', [
    'Realize.comment.Token',
    'Realize.comment.commentsWidget',
    'Realize.comment.writeCommentForm',
    'Realize.comment.listComment',
    'Realize.comment.commentsApiService',
    'Realize.comment.commentsUtilService',
    'Realize.common.tokenInterceptor',
    'Realize.Comment.DisplayTime',
    'Realize.common.tokenRecovery'
    ])
    .config(['SessionTimeoutServiceProvider',
        'CommonTokenInterceptorProvider',
        'CommonTokenRecoveryProvider',
        function(SessionTimeoutServiceProvider, CommonTokenInterceptorProvider, CommonTokenRecoveryProvider) {
            'use strict';

            CommonTokenInterceptorProvider.registerTokenProvider('CommentsTokenSvc');
            CommonTokenRecoveryProvider.registerTokenProvider('CommentsTokenSvc');
        }
    ]);
