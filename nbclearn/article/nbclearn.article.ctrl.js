angular.module('Realize.NbcLearn.article', [
        'Realize.paths',
        'Realize.navigationService'
    ])
    .controller('nbcLearnArticleCtrl', [
        '$scope',
        '$rootScope',
        '$log',
        'NavigationService',
        'NBCArticleData',
        function($scope, $rootScope, $log, NavigationService, NBCArticleData) {
            'use strict';

            $rootScope.hidePlatform = true;
            $scope.showBack = true;

            $scope.embedUrl = NBCArticleData.embedUrl;
            $scope.article = NBCArticleData.article;

            $scope.back = function() {
                NavigationService.back('/home');
            };
        }
    ]);
