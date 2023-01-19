angular.module('realize.template-protection', [
    'realize.templates'
])
    .factory('templateInterceptor', [
        '$log',
        '$templateCache',
        '$browser',
        function($log, $templateCache, $browser) {
            'use strict';

            return {
                request: function(config) {
                    if (config.url.indexOf('templates/') === 0) {
                        var template = $templateCache.get(config.url);
                        if (template) {
                            //$log.debug('copying template cache to base', $browser.baseHref() + config.url);
                            $templateCache.put($browser.baseHref() + config.url, template);
                        }
                    }
                    return config;
                }
            };
        }
    ])
    .config([
        '$httpProvider',
        function($httpProvider) {
            'use strict';

            $httpProvider.interceptors.push('templateInterceptor');
        }
    ]);
