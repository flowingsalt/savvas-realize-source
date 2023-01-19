angular.module('RealizeApp')
    .controller('ReviewerHomeCtrl', [
        '$scope',
        '$log',
        'SHARED_THUMBNAIL_PATH',
        '$location',
        'BrowserInfo',
        function($scope, $log, SHARED_THUMBNAIL_PATH, $location, BrowserInfo) {
            'use strict';

            $scope.background = SHARED_THUMBNAIL_PATH + '/homepage/' +
                ($scope.currentUser.getAttribute('home.background') || 'teacher6') +
                (BrowserInfo.isHDDisplay ? '@2x.jpg' : '.jpg');

            $scope.getStarted = function() {
                $location.path('/review/program');
            };

            $scope.step1More = function(e) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/program');
            };

            $scope.step2More = function(e) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/classes');
            };

            $scope.step3More = function(e) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/data');
            };

            $scope.step4More = function(e) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/centers');
            };
        }
    ]);
