angular.module('Realize.filters.excludeCurrentUser', [])
    .filter('excludeCurrentUser', [
        '$rootScope',
        function($rootScope) {
            'use strict';

            return function(users) {
                if (!users) {
                    return '';
                }

                if (!angular.isArray(users)) {
                    return users;
                } else {
                    return _.filter(users, function(user) {
                        return user.userId !== $rootScope.currentUser.userId;
                    });
                }

            };
        }
    ]);
