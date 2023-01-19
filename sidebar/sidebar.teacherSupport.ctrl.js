angular.module('Realize.sidebar.TeacherSupportSidebarCtrl', [
    'RealizeApp',
    'RealizeDataServices',
    'Realize.content',
    'webStorageModule'
])
    .controller('TeacherSupportSidebarCtrl', [
        '$log',
        '$scope',
        '$rootScope',
        '$location',
        '$timeout',
        'Content',
        'Messages',
        'lwcI18nFilter',
        function($log, $scope, $rootScope, $location, $timeout, Content, Messages, lwcI18nFilter) {
            'use strict';

            $scope.currentUser = $rootScope.currentUser;
            $scope.getMessage = Messages.getMessage;

            // only keep this value per user in case multiple users share a machine

            $scope.open = function(e, item) {
                e.stopPropagation();
                // todo: assert isFunction?
                $scope.openHandler.call(null, e, item);

            };

            $scope.hide = function(event) {
                event.stopPropagation();

                $scope.show = false;
            };

            $scope.isCustomizedItem = function(item) {
                return item.$isCustomizedTest() ? lwcI18nFilter('content.action.editCustomize') :
                    lwcI18nFilter('program.action.customize') ;
            };

            // can the logged-in user edit assessments
            $scope.canUserEditAssessment = $rootScope.currentUser.hasRole('ROLE_TEACHER');

            var inProgramView = $location.path().indexOf('program') >= 0;
            var inLesson = $location.path().indexOf('lesson') >= 0;
            var inCentersTab = $location.path().indexOf('centers') >= 0;
            var inCenterView = $location.path().indexOf('center/') >= 0;
            $scope.removeHideQuicklinkinTeacherResource = function() {
                return ((inProgramView || inLesson) && !inCentersTab && !inCenterView);
            };
        }
    ]);
