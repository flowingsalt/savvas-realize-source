(function() {
    'use strict';

    angular.module('Realize.common.handlePostMessage', [])
        .factory('sendPostMessage', [
            '$window',
            function($window) {
                function sendPostMessage(message, target, targetOrigin) {
                    target = target || $window;
                    targetOrigin = targetOrigin || '*';

                    if (typeof message === 'string') {
                        message = angular.toJson(message);
                    }

                    target.postMessage(message, targetOrigin);
                }

                return sendPostMessage;
            }
        ])
        .run([
            '$window',
            '$log',
            '$rootScope',
            function($window, $log, $rootScope) {
                angular.element($window).on('message', function(event) {
                    var result;

                    event = event.originalEvent || event;

                    if (event && event.data) {
                        try {
                            result = angular.fromJson(event.data);
                        } catch (e) {
                            $log.warn('Error parsing message as JSON, likely it\'s text.', e, event.data);
                            result = event.data;
                        }
                        $rootScope.$broadcast('postMessageEvent', {
                            origin: event.origin,
                            source: event.source,
                            data: result
                        });
                    }
                });
            }
        ]);
})();
