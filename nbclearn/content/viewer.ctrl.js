angular.module('Realize.NbcLearn.content.viewer', [
    'Realize.content.fullscreenPlayer',
    'Realize.reporting.data.TrackingService'
])
.constant('NOT_APPLICABLE', 'na')
.controller('NbcLearnVideoPlayerCtrl', [
    '$scope',
    '$rootScope',
    'content',
    'lwcI18nFilter',
    '$window',
    'TrackingService',
    '$routeParams',
    'NOT_APPLICABLE',
    function($scope, $rootScope, content, lwcI18nFilter, $window, TrackingService, $routeParams, NOT_APPLICABLE) {
        'use strict';

        $rootScope.hidePlatform = true;
        $scope.showBack = true;

        $scope.back = function() {
            $scope.goBack('/home');
        };

        $scope.video = {
            title: content.$getTitle(),
            url: content.url
        };

        function stopTracking() {
            TrackingService.trackContent(
                $routeParams.classUuid || NOT_APPLICABLE,
                content.id,
                content.version,
                $routeParams.assignmentId || NOT_APPLICABLE,
                'stops'
            );
        }

        function startTracking() {
            TrackingService.trackContent(
            $routeParams.classUuid || NOT_APPLICABLE,
            content.id,
            content.version,
            $routeParams.assignmentId || NOT_APPLICABLE,
            'starts'
            );
            $scope.$on('$locationChangeStart', stopTracking);

            $window.onbeforeunload = function() {
                $scope.$apply(stopTracking);
            };

            $scope.$on('$destroy', function() {
                $window.onbeforeunload = null;
            });
        }

        startTracking();

        if (!$rootScope.isNbcLearnUser()) {
            var studentOrTeacher = $rootScope.currentUser.isStudent ? 'student' : 'teacher';

            $scope.$on('fullscreenplayer.loaded', function() {
                $scope.$broadcast(
                    'fullscreenplayer.notification',
                    'info',
                    lwcI18nFilter('nbc.learn.alert.videoPreview.' + studentOrTeacher + '.title'),
                    lwcI18nFilter('nbc.learn.alert.videoPreview.' + studentOrTeacher + '.message')
                );
            });
        }

    }
]);
