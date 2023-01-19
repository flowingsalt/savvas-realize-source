angular.module('Realize.Discussions.Navigation', [
    'Realize.navigationService'
])
    .service('DiscussNavigation', [
        '$location',
        '$rootScope',
        '$window',
        '$currentUser',
        'NavigationService',
        'locationUtilService',
        function($location, $rootScope, $window, $currentUser, NavigationService, locationUtilService) {
            'use strict';
            var svc = this;

            svc.clearParams = function() {
                $location.search('boardId', null);
                $location.search('postId', null);
                $location.search('view', null);
                $location.search('state', null);
            };

            svc.goToCreate = function(boardId) {
                svc.clearParams();

                $location.search('view', 'create');

                if (boardId) {
                    $location.search('boardId', boardId);
                }
            };

            svc.goToList = function(boardId) {
                svc.clearParams();

                $location.search('view', 'list');
                $location.search('boardId', boardId);
            };

            svc.goToPost = function(boardId, postId) {
                svc.clearParams();

                $location.search('view', 'thread');
                $location.search('boardId', boardId);
                $location.search('postId', postId);
            };

            svc.back = function() {
                var navigationBackUrl = $location.search().backUrl;
                svc.clearParams();
                var path;
                var fallbackPath;
                if (navigationBackUrl) {
                    NavigationService.navigateOutsideAngularContext(navigationBackUrl);
                } else {
                    if (!!$location.search().discuss) {
                        path = $location.path().split('/assignments');
                        $location.path(path[0]);
                    } else {
                        fallbackPath = '/classes';
                        $rootScope.back(fallbackPath);
                    }
                }
            };

            svc.getWindowLocationOrigin = function() {
                var port = $window.location.port;

                if (!$window.location.origin) {
                    return $window.location.protocol + '//' + $window.location.hostname + (port ? ':' + port : '');
                }

                return $window.location.origin;
            };

            svc.goToThreadView = function(classId, assignmentId, contentItem) {
                var path = ['/classes', classId, 'discuss/assignments', assignmentId,
                    'content', contentItem].join('/');

                $location.path(path);
            };

            svc.goToStudentStatusView = function(classId, assignmentId) {
                var path = '';
                if (locationUtilService.isDeeplinkDiscussTabActive()) {
                    $window.parent.location.href = $window.location.protocol +
                    '//' + $window.location.hostname + '/dashboard/classes/' + classId +
                    '/details/assignments/' + assignmentId + '/review';
                }else {
                    path = ['/classes', classId, 'assignments', assignmentId].join('/');
                    if ($currentUser.isTeacher) {
                        path = path + '/allstudents';
                    }
                    $location.path(path);
                }
            };

            svc.goToStudentAssignmentList = function(classId, studentId, assignmentState, activeTab) {
                if (locationUtilService.isDeeplinkDiscussTabActive()) {
                    $location.path('/dashboard/classes/' + classId + '/student/' + studentId +
                     '/assignments');
                }else {
                    $location.path('/classes/' + classId + '/student/' + studentId + '/assignments').search({
                        status: assignmentState,
                        activeTab: activeTab
                    });
                }

            };

            return svc;
        }
    ]);
