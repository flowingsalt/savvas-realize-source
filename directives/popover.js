// popover.js - directive
angular.module('RealizeDirectives')
    .directive('reaPopover',
        function() {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    $(attrs.target).click(function() {
                        var display = $(el).css('display');

                        // only allow one open at a time
                        $('*[rea-popover]').fadeOut('fast');
                        if (display === 'none') {
                            $(el).fadeIn('fast');
                        } else {
                            $(el).fadeOut('fast');
                        }
                    });
                }
            };
        }
    );
