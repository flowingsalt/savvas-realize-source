angular.module('RealizeApp.logout', [
        'ngRoute',
        'RealizeApp.logoutCtrl'
    ])
    .config([
        '$routeProvider',
        function($routeProvider) {
            'use strict';

            $routeProvider.when('/logout', {
                controller: 'LogoutCtrl',
                template: '<div></div>'
            });
        }
    ]);
