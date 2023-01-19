angular.module('Realize.common.keyStore', [])
    .factory('KeyStore', function() {
        'use strict';

        function KeyStore() {
            var store = {};

            this.add = this.set = function(key, value) {
                store[key] = value;
            };

            this.get = function(key) {
                return store[key];
            };

            this.remove = function(key) {
                delete store[key];
            };

            this.empty = function() {
                store = {};
            };
        }

        return KeyStore;
    });
