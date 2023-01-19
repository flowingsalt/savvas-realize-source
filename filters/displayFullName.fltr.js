angular.module('Realize.filters.displayFullName', [])
    .filter('displayFullName',
        function() {
            'use strict';

            return function(users) {
                if (!users) {
                    return '';
                }

                return _.map(users, function(user) {
                    return user.firstName + ' ' + user.lastName;
                });
            };
        }
    );
