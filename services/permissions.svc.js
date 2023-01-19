/**
  * TODO: Refactor the Realize app and remove flags based on roles such as Teacher, Student, Admin and Library Review.
  *       Enhance the Permission based architecture based on features.
  **/
angular.module('Realize.core.security.permissions', [])
    .provider('Permissions', [
        function() {
            'use strict';

            var permissions = {};

            this.definePermissions = function(keys) {
                angular.forEach(keys, function(key) {
                    permissions[key] = false;
                });
            };

            this.setPermissions = function(config) {
                angular.extend(permissions, config);
            };

            this.addPermission = function(key, value) {
                permissions[key] = value;
            };

            this.$get = ['$injector', function($injector) {
                var service = this;

                service.getPermissions = function() {
                    return angular.extend({}, permissions);
                };

                service.hasPermission = function(feature) {
                    return permissions[feature] && $injector.invoke(permissions[feature]);
                };
                return service;
            }];
        }
    ]);
