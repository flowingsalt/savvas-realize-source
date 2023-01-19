angular.module('Realize.common.dateFilterDecorator', [])
.config([
    '$provide',
    function($provide) {
        'use strict';

        $provide.decorator('dateFilter', [
            function() {
                var conversion = {
                    'short': 'L LT',
                    'shortDate': 'L',
                    'medium': 'lll',
                    'mediumDate': 'll',
                    'fullDate': 'LL',
                    'longDate': 'LLLL',
                    //we need to add this format to solve notebook date format MM/dd/yy h:mma
                    'MM/dd/yy h:mma': 'MM/DD/YY h:mma'
                };

                var momentFilter = function(input, format) {
                    var parsed = moment(input);

                    format = format || 'mediumDate';
                    // moment handles localization as well
                    format = conversion[format] || format;

                    return parsed.format(format);
                };

                return momentFilter;
            }
        ]);
    }
]);
