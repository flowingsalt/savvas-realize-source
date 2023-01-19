angular.module('RealizeApp')
    .controller('ErrorCtrl', [
        '$scope',
        '$route',
        'CONTINEO_CAT_URL',
        'lwcI18nFilter',
        '$window',
        '$location',
        '$rootScope',
        function($scope, $route, CONTINEO_CAT_URL, lwcI18nFilter, $window, $location, $rootScope) {
            'use strict';

            if ($rootScope.isIFramed()) {
                $rootScope.hidePlatform = true;
            }
            $scope.errorType = $route.current.params.errorType;
            $scope.isStudent = $scope.currentUser.hasRole('ROLE_STUDENT');
            $scope.CONTINEO_CAT_URL = CONTINEO_CAT_URL;
            $scope.zeroStateDataTabDetails = {
                headingText: lwcI18nFilter('classList.autoPlus.zeroStateClass.heading'),
                contentText: lwcI18nFilter('classList.autoPlus.zeroStateClass.messageContent'),
                createClassButtonText: lwcI18nFilter('classList.autoPlus.zeroStateClass.addProgram'),
                createClassButtonLink: $scope.CONTINEO_CAT_URL,
                connectClassButtonText: lwcI18nFilter('classList.autoPlus.zeroStateClass.connectClass'),
                connectClassButtonLink: $location.absUrl(),
                isFederatedUser: true,
                isClassesTab: false
            };
        }
    ]);
