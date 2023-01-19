angular.module('Realize.Interceptors.CSRFToken', [
    'Realize.paths'
])
    .constant('CSRFTOKEN', window.csrfToken)

    .service('CSRFTokenInterceptor', [
        'PATH',
        'CSRFTOKEN',
        function(PATH, CSRFTOKEN) {
            'use strict';

            return {
                request: function(config) {
                    if (config.url.indexOf(PATH.REST) !== -1) {
                        config.headers = angular.extend(config.headers || {}, {
                            'X-Realize-Token': CSRFTOKEN
                        });

                        return config;
                    }

                    return config;
                }
            };
        }
    ]);
