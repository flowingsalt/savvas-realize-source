angular.module('popover.templateOverride', [])
.run([
    '$templateCache',
    function($templateCache) {
        'use strict';

        // https://github.com/jscs-dev/node-jscs/issues/339
        // jscs:disable
        $templateCache.put('template/popover/popover.html',
            '<div class=\"popover {{placement}}\" tabindex=\"0\" aria-live=\"assertive\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n' +
            '  <div class=\"arrow\"></div>\n' +
            '\n' +
            '  <div class=\"popover-inner\">\n' +
            '      <h3 class=\"popover-title\" ng-bind-html=\"title\" ng-show=\"title\"></h3>\n' +
            '      <div class=\"popover-content\" ng-bind-html=\"content\"></div>\n' +
            '  </div>\n' +
            '</div>\n' +
            '');
        // jscs:enable
    }
]);
