angular.module('Realize.common.libs.moment', [])
    .provider('moment', function() {
        'use strict';

        var momentLib = window.moment;

        if (!momentLib) {
            // TODO: version check?
            throw new Error('Third party lib moment.js is required!');
        }

        this.$get = [
            '$log',
            function($log) {
                $log.debug('Including momentjs v', momentLib.version);

                return momentLib;
            }
        ];
    });
